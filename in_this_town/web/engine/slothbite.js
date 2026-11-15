// The Sloth Bite (Flower Man remake 4): in Copper Hollow whichever animal bites you first gives you its power. Hazel got a sloth.
//   hollowStreet()   the town street (origin): the BITE & CO. pet shop with its price boards (.window), a tall wall the gecko kid walks up
//                    (.wall: { x, z } of its face, normal +z), the welcome sign, cottages, trees
//   pettingZoo()     the memory: a hay pen with a fence, a sign and the sloth's tree (.branch: local y and the x span of the hanging branch)
//   courtyard()      the school courtyard: the school with its big clock (.clock.set(minutes)), the fountain (.fountain: centre, R, rimH,
//                    waterY; .jets), picnic tables (.tables: [{ x, z }]), Hazel's bench (.bench), the dodgeball court
//   creatures: sloth() (.set(t, { reach, bite, blink })), bird(o) (a parrot or a falcon: .set(t, { flap, beak, tilt }))
//   props: sketchbook(), cookie(), phone(col), dodgeball(), priceBoard(rows), speedLines() (.set(on, dir, len)), slowBubble()
//          (.set(k, t)), splash() (.set(t0, t, pos)), stinkCloud() (.set(t, k)), sparkle() (.set(k))
import * as THREE from 'three';
import { v3, rng, clamp, lerp } from './core.js';
import { Batch, surf, paint, lamp, sign, building } from './kit.js';
import { canvasTex } from './props.js';
import { cottage, flowers } from './pastel.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent)) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
function flat(mat, w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8;
  for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
const FONT = (px) => `900 ${px}px ITTInter, sans-serif`;
const glowM = (col, op = 1, add = true) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, toneMapped: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
function tree(b, x, z, h, leafCol, r = 1) {
  const bark = paint('#86603e', { roughness: 0.9 }), m = paint(leafCol, { roughness: 0.85 });
  b.cyl(bark, 0.45 * r, 0.65 * r, h, x, h / 2, z, { seg: 10 });
  for (const [dx, dy, dz, rr] of [[0, h + 1.2, 0, 3.6], [1.9, h - 0.4, 0.6, 2.7], [-1.8, h - 0.2, -0.5, 2.8], [0.3, h - 0.6, -1.9, 2.4]]) b.add(m, new THREE.IcosahedronGeometry(rr * r, 2), x + dx * r, dy, z + dz * r);
}

// ---------------- creatures ----------------
// our own sloth: a round shaggy body, a cream face mask with dark eye stripes and a sleepy smile, long arms ending in three hooked claws.
// Local frame: hangs under a branch along x at y = 0 (the claws grip y = 0); the body hangs below, the face looks +z.
export function sloth() {
  const g = new THREE.Group(), fur = paint('#7a6048', { roughness: 0.95 }), furD = paint('#5e4836', { roughness: 0.95 }), mask = paint('#f8eed8', { roughness: 0.9 }),
    stripe = paint('#3b2a1e', { roughness: 0.7 }), claw = paint('#e9dcc0', { roughness: 0.5 }), eye = paint('#120c08', { roughness: 0.2 }), nose = paint('#2a1c14', { roughness: 0.4 });
  const body = new THREE.Group(); body.position.set(0, -2.6, 0); g.add(body);
  { const b = new Batch(); b.add(fur, new THREE.SphereGeometry(1.5, 20, 14).scale(1.0, 1.25, 0.85), 0, 0, 0); b.add(furD, new THREE.SphereGeometry(1.0, 14, 10).scale(1.1, 1.0, 0.6), 0, -0.4, 0.62);
    for (let i = 0; i < 14; i++) { const a = i * 0.9; b.add(furD, new THREE.ConeGeometry(0.22, 0.7, 5), Math.sin(a) * 1.3, -1.2 + (i % 4) * 0.5, Math.cos(a) * 1.0, 0, Math.PI, 0); }   // shaggy tufts
    b.done(body); }
  const head = new THREE.Group(); head.position.set(0, 1.55, 0.25); body.add(head); g.head = head;
  { const b = new Batch(); b.add(fur, new THREE.SphereGeometry(1.0, 20, 14).scale(1.05, 0.95, 0.92), 0, 0, 0); b.add(mask, new THREE.SphereGeometry(0.88, 20, 14).scale(1.05, 0.9, 0.6), 0, -0.02, 0.52);
    for (const s of [-1, 1]) { b.add(stripe, new THREE.SphereGeometry(0.3, 14, 10).scale(1.5, 0.55, 0.4), s * 0.36, 0.08, 0.84, 0, 0, s * -0.35); b.add(eye, new THREE.SphereGeometry(0.1, 10, 8), s * 0.3, 0.1, 0.96); }
    b.add(nose, new THREE.SphereGeometry(0.16, 12, 8).scale(1.3, 0.85, 0.8), 0, -0.14, 1.0); b.done(head); }
  const lid = new THREE.Group(); { const b = new Batch(); for (const s of [-1, 1]) b.add(mask, new THREE.SphereGeometry(0.13, 10, 8).scale(1.2, 0.9, 0.6), s * 0.3, 0.12, 0.98); b.done(lid); } head.add(lid); g.lid = lid;
  // the mouth: a dark smile that opens into a slow bite
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.4, 0.4, 0.6), paint('#3a1a14', { roughness: 0.6 })); jaw.position.set(0, -0.36, 0.86); head.add(jaw); g.jaw = jaw;
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.06), paint('#fff8ec')); teeth.position.set(0, -0.3, 0.98); head.add(teeth); g.teeth = teeth;
  // arms: shoulder pivots, a long furry limb, three claws
  const limb = (side, y, len) => { const p = new THREE.Group(); p.position.set(side * 1.0, y, 0); body.add(p); const b = new Batch(); b.cyl(fur, 0.36, 0.3, len, 0, len / 2, 0, { seg: 10 }); for (let k = -1; k <= 1; k++) b.add(claw, new THREE.TorusGeometry(0.22, 0.05, 6, 10, Math.PI * 1.1), k * 0.14, len + 0.08, 0.1, Math.PI / 2, 0, 0); b.done(p); p.len = len; return p; };
  g.arms = [limb(-1, 0.7, 2.2), limb(1, 0.7, 2.2)]; g.legs = [limb(-0.8, -1.0, 1.7), limb(0.8, -1.0, 1.7)];
  g.set = (t, o = {}) => {
    const sway = Math.sin(t * 0.7) * 0.06;
    g.arms.forEach((a, i) => { a.rotation.set(0, 0, (i ? -1 : 1) * 0.42 + sway); });
    g.legs.forEach((a, i) => { a.rotation.set(-0.9, 0, Math.PI + (i ? 1 : -1) * 0.3 + sway); });
    if (o.reach) { const a = g.arms[1]; a.rotation.z = lerp(a.rotation.z, -2.4, o.reach); a.rotation.x = lerp(0, 0.9, o.reach); }
    body.rotation.z = -sway * 0.6; body.rotation.x = (o.lean || 0);
    head.rotation.set((o.nod || 0) + (o.bite ? o.bite * 0.35 : 0), (o.turn || 0), Math.sin(t * 0.5) * 0.08);
    jaw.scale.y = 1 + (o.bite || 0) * 2.2; jaw.position.y = -0.36 - (o.bite || 0) * 0.08;
    lid.visible = !!o.blink || (t % 4.1) < 0.35;   // slow, sleepy blinks
  };
  g.mouthWorld = () => { g.updateMatrixWorld(true); return jaw.getWorldPosition(v3()); };
  g.set(0);
  return shadowAll(g);
}
// a bird on a perch: a parrot (green / red / yellow) or a falcon (browns, a hooked beak). Local: feet at y = 0, facing +z, about 1.3 tall at s = 1.
export function bird(o = {}) {
  const g = new THREE.Group(), c = o.cols || ['#2fb24a', '#e8433a', '#ffd23f', '#2a6fd8'];
  const B = paint(c[0], { roughness: 0.55 }), H = paint(o.headCol || c[0], { roughness: 0.55 }), W = paint(c[1], { roughness: 0.55 }), beakM = paint(o.beakCol || '#f2d26a', { roughness: 0.4 }), T = paint(c[3] || c[1], { roughness: 0.55 });
  const body = new THREE.Group(); g.add(body);
  { const b = new Batch(); b.add(B, new THREE.SphereGeometry(0.38, 16, 12).scale(1, 1.3, 1), 0, 0.62, 0); b.add(paint(o.belly || c[2], { roughness: 0.6 }), new THREE.SphereGeometry(0.3, 14, 10).scale(1, 1.2, 0.7), 0, 0.55, 0.14);
    b.add(T, new THREE.BoxGeometry(0.26, 0.9, 0.06), 0, 0.15, -0.3, 0, 0.5, 0); b.add(paint('#4a4a4a', { roughness: 0.6 }), new THREE.CylinderGeometry(0.04, 0.04, 0.24, 6), -0.12, 0.12, 0.02); b.add(paint('#4a4a4a', { roughness: 0.6 }), new THREE.CylinderGeometry(0.04, 0.04, 0.24, 6), 0.12, 0.12, 0.02); b.done(body); }
  const head = new THREE.Group(); head.position.set(0, 1.08, 0.04); g.add(head); g.head = head;
  { const b = new Batch(); b.add(H, new THREE.SphereGeometry(0.3, 16, 12), 0, 0, 0); b.add(paint('#fffaf0', { roughness: 0.4 }), new THREE.SphereGeometry(0.1, 10, 8), 0.17, 0.05, 0.18); b.add(paint('#fffaf0', { roughness: 0.4 }), new THREE.SphereGeometry(0.1, 10, 8), -0.17, 0.05, 0.18);
    b.add(paint('#111111', { roughness: 0.2 }), new THREE.SphereGeometry(0.055, 8, 6), 0.2, 0.06, 0.24); b.add(paint('#111111', { roughness: 0.2 }), new THREE.SphereGeometry(0.055, 8, 6), -0.2, 0.06, 0.24);
    if (o.crest) for (let i = 0; i < 3; i++) b.add(W, new THREE.ConeGeometry(0.06, 0.3, 5), (i - 1) * 0.07, 0.3, -0.05 - i * 0.05, 0, -0.4 - i * 0.2, 0);
    b.add(beakM, new THREE.ConeGeometry(0.11, 0.3, 8).rotateX(Math.PI / 2 + (o.hook ? 0.6 : 0.3)), 0, -0.04, 0.32); b.done(head); }
  const low = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 8).rotateX(Math.PI / 2 - 0.2), beakM); low.position.set(0, -0.16, 0.24); head.add(low); g.lowBeak = low;
  const wings = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.34, 0.85, 0); g.add(p); const b = new Batch(); b.add(W, new THREE.SphereGeometry(0.26, 12, 8).scale(0.35, 1.2, 1), s * 0.06, -0.24, -0.02); b.add(T, new THREE.BoxGeometry(0.05, 0.4, 0.22), s * 0.08, -0.55, -0.08); b.done(p); return p; });
  g.set = (t, k = {}) => {
    const fl = k.flap || 0; wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * fl * (0.6 + 0.9 * Math.abs(Math.sin(t * 22))); });
    low.rotation.x = (k.beak || 0) * 0.6; head.rotation.set(-(k.beak || 0) * 0.25, k.turn || 0, (k.tilt || 0) + Math.sin(t * 2.3) * 0.05);
    g.position.y = (g.userData.y0 ?? g.position.y);
  };
  g.set(0);
  return shadowAll(g);
}

// ---------------- props ----------------
export function sketchbook() {   // a spiral sketchbook; local: lies in x/y, cover facing +z, about 1.4 x 1.8
  const g = new THREE.Group(), b = new Batch();
  b.box(paint('#2d7d6a', { roughness: 0.6 }), 1.4, 1.8, 0.18, 0, 0, 0, { r: 0.04 }); b.box(paint('#f8f4ea', { roughness: 0.9 }), 1.36, 1.76, 0.12, 0.02, 0, 0.02, { r: 0.02 });
  for (let i = 0; i < 9; i++) b.add(paint('#c9ced3', { metalness: 0.8, roughness: 0.3 }), new THREE.TorusGeometry(0.07, 0.018, 5, 10), 0, 0.8 - i * 0.2, 0, 0, Math.PI / 2, 0).add;
  b.done(g);
  for (const ch of g.children) ch.position.x = 0;
  const cov = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(260, 340, (x, W, H) => { x.fillStyle = '#2d7d6a'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#ffe9b0'; x.font = FONT(44); x.textAlign = 'center'; x.fillText('HAZEL', W / 2, 70);
    x.strokeStyle = '#ffe9b0'; x.lineWidth = 7; x.beginPath(); x.arc(W / 2, 200, 62, 0, 7); x.stroke(); x.beginPath(); x.arc(W / 2 - 22, 190, 9, 0, 7); x.arc(W / 2 + 22, 190, 9, 0, 7); x.fillStyle = '#ffe9b0'; x.fill();
    x.beginPath(); x.arc(W / 2, 215, 22, 0.2, Math.PI - 0.2); x.stroke(); }) }));
  cov.position.z = 0.1; g.add(cov);
  return shadowAll(g);
}
export function cookie() { const b = new Batch(); b.cyl(paint('#d49a52', { roughness: 0.85 }), 0.42, 0.42, 0.12, 0, 0, 0, { seg: 18 }); for (let i = 0; i < 6; i++) b.add(paint('#4a2a16', { roughness: 0.7 }), new THREE.SphereGeometry(0.07, 6, 5), Math.sin(i * 2.1) * 0.24, 0.07, Math.cos(i * 2.1) * 0.24); return shadowAll(b.done()); }
export function phone(col = '#ff5a8a') {
  const g = new THREE.Group(), b = new Batch(); b.box(paint(col, { roughness: 0.35 }), 0.5, 0.95, 0.08, 0, 0, 0, { r: 0.04 }); b.done(g);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.82), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ad8ff').multiplyScalar(1.1), toneMapped: false })); s.position.z = 0.045; g.add(s); return shadowAll(g);
}
export function dodgeball() { const m = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshStandardMaterial({ color: '#e8433a', roughness: 0.45 })); m.castShadow = true; return m; }
export function priceBoard(rows, o = {}) {   // a shop window price board: [[item, price], ...]
  const w = o.w ?? 5.2, h = o.h ?? 4.2;
  const t = canvasTex(520, 420, (x, W, H) => { x.fillStyle = o.bg || '#fff6d8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#c0392b'; x.lineWidth = 12; x.strokeRect(8, 8, W - 16, H - 16);
    x.fillStyle = '#c0392b'; x.font = FONT(46); x.textAlign = 'center'; x.fillText(o.title || 'TODAY', W / 2, 66);
    rows.forEach(([a, p], i) => { const y = 140 + i * 92; x.textAlign = 'left'; x.fillStyle = '#2b2f3a'; x.font = FONT(38); x.fillText(a, 30, y); x.textAlign = 'right'; x.fillStyle = '#1a8a4a'; x.font = FONT(42); x.fillText(p, W - 30, y + 40); }); });
  const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })); g.add(m);
  const fr = new Batch(); fr.box(paint('#6a3a22', { roughness: 0.6 }), w + 0.3, h + 0.3, 0.12, 0, 0, -0.08, { r: 0.04 }); fr.done(g); return shadowAll(g);
}
// speed streaks behind a runner: thin glowing rods along the motion
export function speedLines(col = '#ffffff') {
  const g = new THREE.Group(), r = rng(9); g.rods = [];
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 5).rotateX(Math.PI / 2), glowM(i % 4 === 0 ? '#ffd84a' : col, 0.5)); m.userData.noAO = true; m.userData.o = [(r() - 0.5) * 2.4, 0.4 + r() * 4.4, r() * 1.5, 0.6 + r() * 0.8]; g.add(m); g.rods.push(m); }
  g.set = (on, pos, dir, len, scale = 1) => {   // pos: the runner's feet, dir: unit motion, len: streak length
    g.visible = on > 0.01; if (!g.visible) return;
    g.position.copy(pos); g.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    g.rods.forEach((m) => { const [x, y, z, l] = m.userData.o; const L = len * l; m.scale.set(1, 1, L); m.position.set(x * scale, y * scale, -z - L / 2 - 0.6); m.material.opacity = 0.55 * on; });
  };
  return g;
}
// the slow-time bubble: a faint teal shell with drifting rings
export function slowBubble() {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: '#7ff0e0', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.BackSide, toneMapped: false })); sh.userData.noAO = true; g.add(sh);
  const rings = []; for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64), glowM('#9ffff0', 0.5)); m.userData.noAO = true; g.add(m); rings.push(m); }
  g.set = (k, t, r = 4.5) => { g.visible = k > 0.01; if (!g.visible) return; g.scale.setScalar(r * (0.4 + 0.6 * k)); sh.material.opacity = 0.11 * k;
    rings.forEach((m, i) => { const u = ((t * 0.12 + i / 3) % 1); m.scale.setScalar(0.4 + u * 0.62); m.position.y = (u - 0.5) * 0.4; m.rotation.x = Math.PI / 2 + Math.sin(t * 0.3 + i) * 0.4; m.material.opacity = 0.55 * k * Math.sin(u * Math.PI); }); };
  return g;
}
// gaze ripples: rings travelling from the eyes to a target
export function gazeRipples(n = 5) {
  const g = new THREE.Group(), rs = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 6, 48), glowM('#8ff7e8', 0.6)); m.userData.noAO = true; g.add(m); rs.push(m); }
  g.set = (k, t, a, b) => { g.visible = k > 0.01; if (!g.visible) return; const d = b.clone().sub(a), q = new THREE.Quaternion().setFromUnitVectors(v3(0, 0, 1), d.clone().normalize());
    rs.forEach((m, i) => { const u = (t * 0.35 + i / n) % 1; m.position.copy(a).addScaledVector(d, u); m.quaternion.copy(q); m.scale.setScalar(0.25 + u * 1.6); m.material.opacity = 0.6 * k * Math.sin(u * Math.PI); }); };
  return g;
}
// a splash: droplets on ballistic arcs plus a foam ring
export function splash(n = 70) {
  const g = new THREE.Group(), r = rng(21), geo = new THREE.SphereGeometry(0.16, 8, 6), mat = new THREE.MeshStandardMaterial({ color: '#dff6ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.9 });
  const drops = new THREE.InstancedMesh(geo, mat, n); drops.userData.noAO = true; g.add(drops); const V = [];
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, s = 2 + r() * 6; V.push([Math.cos(a) * s, 6 + r() * 9, Math.sin(a) * s, 0.6 + r() * 1.2]); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.25, 8, 40).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, transparent: true, opacity: 0.8 })); g.add(ring);
  const M = new THREE.Matrix4(), Qn = new THREE.Quaternion(), S = v3(1, 1, 1);
  g.set = (t0, t, pos) => { const u = t - t0; g.visible = u > 0 && u < 2.2; if (!g.visible) return; g.position.copy(pos);
    V.forEach(([vx, vy, vz, sc], i) => { const y = vy * u - 9.8 * u * u; const sz = y < -0.3 ? 0.001 : sc; S.set(sz, sz * 1.3, sz); M.compose(v3(vx * u, Math.max(-0.3, y), vz * u), Qn, S); drops.setMatrixAt(i, M); }); drops.instanceMatrix.needsUpdate = true;
    ring.scale.setScalar(0.8 + u * 3.2); ring.material.opacity = 0.8 * clamp(1 - u / 1.4); };
  return g;
}
export function stinkCloud() {   // green puffs drifting off a skunk kid
  const g = new THREE.Group(), r = rng(5), ps = [];
  const tex = canvasTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(170,230,90,0.9)'); gr.addColorStop(0.6, 'rgba(130,200,60,0.45)'); gr.addColorStop(1, 'rgba(120,190,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); });
  for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.8 })); s.userData.o = [r() * Math.PI * 2, r(), 0.8 + r() * 1.2]; s.userData.noAO = true; g.add(s); ps.push(s); }
  g.set = (t, k, dir = v3(1, 0, 0)) => { g.visible = k > 0.01; if (!g.visible) return; ps.forEach((s) => { const [a, ph, sz] = s.userData.o, u = (t * 0.45 + ph) % 1; s.position.set(Math.cos(a) * (0.6 + u * 1.6) + dir.x * u * 4, 1.2 + u * 3.2 + Math.sin(a * 3) * 0.4, Math.sin(a) * (0.6 + u * 1.6) + dir.z * u * 4); s.scale.setScalar(sz * (0.4 + u * 0.9)); s.material.opacity = 0.62 * k * Math.sin(u * Math.PI); }); };
  return g;
}
export function sparkle() {   // a little star burst (a power passing in a bite)
  const g = new THREE.Group(), r = rng(3), st = [];
  const tex = canvasTex(128, 128, (x) => { x.translate(64, 64); x.fillStyle = '#fff6c0'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? 14 : 60; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.fill(); });
  for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: i % 3 ? '#ffe27a' : '#9ff7ff', toneMapped: false })); s.userData.o = [r() * Math.PI * 2, r() * Math.PI - Math.PI / 2, 0.6 + r()]; s.userData.noAO = true; g.add(s); st.push(s); }
  g.set = (k) => { g.visible = k > 0.01 && k < 1; if (!g.visible) return; st.forEach((s) => { const [a, e, d] = s.userData.o; const rr = d * (0.3 + k * 1.6); s.position.set(Math.cos(a) * Math.cos(e) * rr, Math.sin(e) * rr, Math.sin(a) * Math.cos(e) * rr); s.scale.setScalar(0.5 * Math.sin(k * Math.PI) + 0.05); }); };
  return g;
}
export function wallClock() {   // the school's big clock: .set(minutes) moves both hands; faces +z
  const g = new THREE.Group(), b = new Batch(), R = 3.2;
  b.cyl(paint('#d9a93a', { metalness: 0.8, roughness: 0.3 }), R + 0.4, R + 0.4, 0.5, 0, 0, -0.2, { rx: Math.PI / 2, seg: 48 }); b.done(g);
  const face = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(256, 256, (x, W, H) => { x.fillStyle = '#fff8e8'; x.beginPath(); x.arc(128, 128, 127, 0, 7); x.fill(); x.fillStyle = '#2b2f3a'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; x.save(); x.translate(128 + Math.sin(a) * 104, 128 - Math.cos(a) * 104); x.rotate(a); x.fillRect(-4, -12, 8, i % 3 ? 16 : 26); x.restore(); } x.font = FONT(26); x.textAlign = 'center'; x.fillText('LUNCH', 128, 178); }) }));
  face.position.z = 0.06; g.add(face);
  const hand = (len, w, col) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.08), paint(col, { roughness: 0.4 })); m.position.y = len / 2 - 0.25; p.add(m); p.position.z = 0.14; g.add(p); return p; };
  const hh = hand(1.8, 0.28, '#2b2f3a'), mh = hand(2.7, 0.18, '#2b2f3a'), sh = hand(2.8, 0.06, '#e8433a');
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16).rotateX(Math.PI / 2), paint('#d9a93a', { metalness: 0.8 })); cap.position.z = 0.24; g.add(cap);
  g.set = (min, sec = null) => { mh.rotation.z = -min / 60 * Math.PI * 2; hh.rotation.z = -(12 + min / 60) / 12 * Math.PI * 2; sh.rotation.z = -((sec ?? min * 60) % 60) / 60 * Math.PI * 2; };
  g.set(13);
  return shadowAll(g);
}

// ---------------- the town street ----------------
export const SHOP = { x: 0, z: -10, front: -1.0 };
export function hollowStreet() {
  const g = new THREE.Group(), b = new Batch(), r = rng(404);
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14; g.add(flat(grass, 1400, 1400, 0, -0.05, 0));
  g.add(flat(surf('concrete', '#d4cdc0'), 260, 12, 0, 0.01, 6)); g.add(flat(surf('concrete', '#5c6168'), 260, 16, 0, 0.0, 20));
  for (let x = -120; x < 120; x += 8) b.box(paint('#fff6d8'), 4, 0.04, 0.4, x, 0.03, 20, { r: 0.01 });
  // BITE & CO.: a two-floor shop, coral stucco, a big front window with price boards and a perch inside
  const shop = new THREE.Group(); shop.position.set(SHOP.x, 0, SHOP.z); g.add(shop);
  { const sb = new Batch(), wall = surf('stucco', '#ff9e86'), trim = paint('#fff4dc', { roughness: 0.5 }), dark = paint('#20394a', { roughness: 0.4 });
    sb.box(wall, 26, 16, 16, 0, 8, -8, { r: 0.15 }); sb.box(trim, 27, 0.8, 17, 0, 16.2, -8, { r: 0.15 });
    sb.box(trim, 26.4, 1.2, 0.6, 0, 0.6, 0.05, { r: 0.1 });
    // window: a frame round a dark recess, door on the right
    sb.box(new THREE.MeshStandardMaterial({ color: '#3b6a8a', roughness: 0.08, metalness: 0.5 }), 14, 7.4, 0.3, -4, 4.9, 0.05, { r: 0.05 }); for (const x of [-11.2, 3.2]) sb.box(trim, 0.6, 8.2, 0.6, x, 4.9, 0.2, { r: 0.08 }); sb.box(trim, 15.0, 0.6, 0.8, -4, 9.0, 0.25, { r: 0.08 }); sb.box(trim, 15.0, 0.6, 1.2, -4, 1.2, 0.35, { r: 0.08 });
    sb.box(paint('#2a6fd8', { roughness: 0.45 }), 4.2, 8.6, 0.4, 8, 4.3, 0.1, { r: 0.08 }); sb.cyl(paint('#e2b04a', { metalness: 0.9, roughness: 0.25 }), 0.2, 0.2, 0.3, 6.6, 4.3, 0.4, { rx: Math.PI / 2, seg: 12 });
    // the awning: stripes
    for (let i = 0; i < 9; i++) sb.box(paint(i % 2 ? '#fff4dc' : '#2fb2a0', { roughness: 0.6 }), 2.0, 0.25, 3.4, -12 + i * 2.0 + 1, 10.4, 1.5, { r: 0.05, rx: 0.35 });
    // upper windows
    for (const x of [-8, 0, 8]) { sb.box(trim, 4.0, 3.6, 0.4, x, 13.0, 0.05, { r: 0.08 }); sb.box(new THREE.MeshStandardMaterial({ color: '#7fb6d8', roughness: 0.1, metalness: 0.4 }), 3.3, 2.9, 0.2, x, 13.0, 0.2, { r: 0.04 }); }
    sb.done(shop);
    const s = sign('BITE & CO.\nPOWERS BY THE NIBBLE', { w: 14, h: 3.0, bg: '#20394a', fg: '#ffd84a', frame: '#e2b04a', edge: '#ffd84a' }); s.position.set(-1, 17.2 + 1.2, 0.3); shop.add(s);
    // inside the window: the price boards, a perch for the falcon, a glass tank
    const inner = new Batch(); inner.cyl(paint('#6a4a2a', { roughness: 0.8 }), 0.12, 0.16, 4.6, 11.8, 2.3, 2.2, { seg: 8 }); inner.cyl(paint('#6a4a2a', { roughness: 0.8 }), 0.1, 0.1, 2.2, 11.8, 4.6, 2.2, { rz: Math.PI / 2, seg: 8 }); inner.cyl(paint('#6a4a2a', { roughness: 0.8 }), 0.9, 1.0, 0.25, 11.8, 0.12, 2.2, { seg: 14 }); inner.done(shop);
    const pb1 = priceBoard([['FALCON NIBBLE', '$900,000'], ['GECKO KISS', '$80,000'], ['SKUNK SNIP', '$45,000']], { title: 'TODAY ONLY' }); pb1.position.set(-7.2, 5.0, 0.32); pb1.scale.setScalar(0.95); shop.add(pb1);
    const pb2 = priceBoard([['SLOTH', 'FREE'], ['', ''], ['', '']], { title: 'PLEASE TAKE', w: 2.8, h: 2.2, bg: '#e8f4ff' }); pb2.position.set(0.4, 3.2, 0.32); pb2.scale.setScalar(0.85); shop.add(pb2);
    g.window = shop; g.perch = v3(11.8, 4.72, 2.2).add(shop.position); g.board = v3(-7.2, 5.0, 0.32).add(shop.position); }
  // the gecko wall: a tall plain apartment block to the left, its face at z = WALLZ
  const apt = building({ style: 'stucco', wall: '#a9d8f5', trim: '#fff4dc', floors: 5, floorH: 6.5, w: 22, d: 16, lit: 0.1, roof: 'flat', seed: 7 }); apt.position.set(-26, 0, -18); g.add(apt);
  g.wall = { x: -26, z: -18 + 8 + 0.02 };
  // the next shop, cottages, the welcome sign and trees
  const s2 = building({ style: 'brick', wall: '#e8b04a', trim: '#fff4dc', floors: 2, floorH: 7, w: 20, d: 16, lit: 0.1, roof: 'flat', seed: 9, name: 'SNACKS' }); s2.position.set(26, 0, -18); g.add(s2);
  ['#f7b9c9', '#bfe8b2', '#d5c3f6', '#ffcaa0'].forEach((col, i) => { const c = cottage({ wall: col, seed: 60 + i, w: 18, d: 13, flowers: true, number: 3 + i * 2 }); c.g.position.set([-52, 50, -76, 74][i], 0, -14); g.add(c.g); });
  for (let x = -110; x <= 110; x += 22) { const c = cottage({ wall: ['#ffcaa0', '#b4ece2', '#f9cfe2', '#bfe8b2'][Math.abs(x / 22) % 4], seed: 140 + x, w: 18, d: 13, flowers: true, number: 20 + x }); c.g.position.set(x, 0, 44); c.g.rotation.y = Math.PI; g.add(c.g); }
  for (const x of [-40, 40, -64, 64, 90, -90]) tree(b, x, 4, 7 + r() * 3, ['#5fbf57', '#7ad06a', '#f6a9c4', '#4fae55'][Math.floor(r() * 4)]);
  for (const x of [-14, 16]) { const l = lamp({ height: 11, color: '#205e66' }); l.position.set(x, 0, 10.5); l.rotation.y = x < 0 ? 0 : Math.PI; g.add(l); }
  const ws = sign('WELCOME TO\nCOPPER HOLLOW', { w: 10, h: 4.2, bg: '#2f7a4a', fg: '#fff4dc', frame: '#6a4a2a', edge: '#ffd84a' }); ws.position.set(14, 6.4, 12.5); ws.rotation.y = -0.45; g.add(ws);
  b.cyl(paint('#6a4a2a', { roughness: 0.8 }), 0.25, 0.25, 6, 14 - 3.6, 3, 12.5 - 1.6 * 0.99, { seg: 8 }); b.cyl(paint('#6a4a2a', { roughness: 0.8 }), 0.25, 0.25, 6, 14 + 3.6, 3, 12.5 + 1.75, { seg: 8 });
  flowers(g, [v3(12, 0, 13.5), v3(16, 0, 11.6), v3(9, 0, 14.4)]);
  b.done(g);
  return shadowAll(g);
}

// ---------------- the petting zoo (the memory) ----------------
export function pettingZoo() {
  const g = new THREE.Group(), b = new Batch(), r = rng(77);
  const grass = surf('grass', '#8fd06a'); grass.userData.span = 14; g.add(flat(grass, 900, 900, 0, -0.05, 0));
  g.add(flat(surf('sand', '#e8cf8a'), 40, 30, 0, 0.01, 0));
  const wood = paint('#a8743f', { roughness: 0.85 }), woodD = paint('#7a5230', { roughness: 0.9 });
  for (let x = -20; x <= 20; x += 2.5) { b.box(wood, 0.35, 3.0, 0.35, x, 1.5, -15, { r: 0.05 }); b.box(wood, 0.35, 3.0, 0.35, x, 1.5, 15, { r: 0.05 }); }
  for (let z = -15; z <= 15; z += 2.5) { b.box(wood, 0.35, 3.0, 0.35, -20, 1.5, z, { r: 0.05 }); b.box(wood, 0.35, 3.0, 0.35, 20, 1.5, z, { r: 0.05 }); }
  for (const y of [1.2, 2.5]) { b.box(woodD, 40, 0.3, 0.2, 0, y, -15, { r: 0.05 }); b.box(woodD, 0.2, 0.3, 30, -20, y, 0, { r: 0.05 }); b.box(woodD, 0.2, 0.3, 30, 20, y, 0, { r: 0.05 }); b.box(woodD, 15, 0.3, 0.2, -12.5, y, 15, { r: 0.05 }); b.box(woodD, 15, 0.3, 0.2, 12.5, y, 15, { r: 0.05 }); }
  // hay bales, a water trough, a red barn behind
  for (const [x, z] of [[-14, -10], [-11.5, -11], [13, -9], [15, 6]]) { b.box(paint('#e8c862', { roughness: 0.95 }), 3, 1.8, 2, x, 0.9, z, { r: 0.2 }); }
  b.box(paint('#8a8f96', { metalness: 0.5, roughness: 0.4 }), 4, 1.2, 1.6, 10, 0.6, 9, { r: 0.1 }); b.box(paint('#5ab7e8', { roughness: 0.1 }), 3.6, 0.1, 1.2, 10, 1.15, 9, { r: 0.02 });
  b.box(paint('#c8483a', { roughness: 0.7 }), 26, 14, 14, 0, 7, -32, { r: 0.2 }); b.box(paint('#fff4dc', { roughness: 0.6 }), 8, 9, 0.4, 0, 4.5, -24.9, { r: 0.1 });
  b.add(paint('#5a3a2a', { roughness: 0.8 }), new THREE.CylinderGeometry(0.01, 15.5, 6, 4, 1).rotateY(Math.PI / 4).scale(1.2, 1, 0.65), 0, 17, -32);
  // the sloth's tree: a fat trunk with one long branch reaching over the sand
  const T = { x: -8, z: -4 };
  b.cyl(paint('#7a5230', { roughness: 0.9 }), 1.0, 1.5, 13, T.x, 6.5, T.z, { seg: 12 });
  b.cyl(paint('#7a5230', { roughness: 0.9 }), 0.42, 0.55, 12, T.x + 6, 5.4, T.z, { rz: Math.PI / 2, seg: 10 }); b.cyl(paint('#7a5230', { roughness: 0.9 }), 0.3, 0.4, 4, T.x + 11.5, 4.0, T.z, { seg: 8 });
  for (const [dx, dy, dz, rr] of [[0, 15, 0, 5.2], [4, 13.4, 2, 3.6], [-4, 13.8, -1, 3.8], [9, 11.6, 0.4, 3.0], [2, 14, -3, 3.4]]) b.add(paint(['#4fae55', '#5fbf57', '#3f9a45'][Math.floor(r() * 3)], { roughness: 0.85 }), new THREE.IcosahedronGeometry(rr, 2), T.x + dx, dy, T.z + dz);
  g.branch = { y: 5.4 + 0.45, x0: T.x + 1, x1: T.x + 11, z: T.z };
  const s = sign('PETTING ZOO\nGENTLE HANDS!', { w: 7, h: 3, bg: '#fff4dc', fg: '#c8483a', frame: '#7a5230', edge: '#c8483a' }); s.position.set(9, 5.0, 15.3); g.add(s);
  b.cyl(woodD, 0.22, 0.22, 4, 6.2, 2, 15.3, { seg: 8 }); b.cyl(woodD, 0.22, 0.22, 4, 11.8, 2, 15.3, { seg: 8 });
  for (const x of [-60, -40, 40, 60]) tree(b, x, -30 + r() * 10, 8 + r() * 3, '#5fbf57');
  b.done(g);
  return shadowAll(g);
}

// ---------------- the school courtyard ----------------
export const FOUNT = { R: 6.0, rimH: 1.6, waterY: 1.15 };
export function courtyard() {
  const g = new THREE.Group(), b = new Batch(), r = rng(808);
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14; g.add(flat(grass, 1400, 1400, 0, -0.06, 0));
  g.add(flat(surf('tile', '#e9dcc4'), 120, 110, 0, 0.0, 6));
  // the school: brick, two floors, a sign, the clock over the door
  const sch = building({ style: 'brick', wall: '#c8644a', trim: '#fff4dc', floors: 2, floorH: 8, w: 76, d: 20, lit: 0.15, door: '#2a6fd8', roof: 'flat', windows: 7, seed: 12, shutters: '#2fb2a0' });
  sch.position.set(0, 0, -36); g.add(sch);
  const ss = sign('COPPER HOLLOW MIDDLE SCHOOL', { w: 26, h: 2.4, bg: '#2a6fd8', fg: '#fff4dc', frame: '#fff4dc', edge: '#ffd84a' }); ss.position.set(0, 13.3, -25.4); g.add(ss);
  const ck = wallClock(); ck.position.set(0, 20.2, -25.4); g.add(ck); g.clock = ck;
  b.box(paint('#fff4dc', { roughness: 0.5 }), 9.6, 9.6, 0.6, 0, 20.2, -25.8, { r: 0.3 });
  // the fountain
  const F = new THREE.Group(); g.add(F); g.fountain = F;
  { const fb = new Batch(), stone = surf('stucco', '#e4e0d8'), stoneD = paint('#bfb8ac', { roughness: 0.7 });
    const ring = new THREE.LatheGeometry([new THREE.Vector2(FOUNT.R - 0.9, 0), new THREE.Vector2(FOUNT.R + 0.4, 0), new THREE.Vector2(FOUNT.R + 0.4, FOUNT.rimH - 0.2), new THREE.Vector2(FOUNT.R + 0.25, FOUNT.rimH), new THREE.Vector2(FOUNT.R - 0.75, FOUNT.rimH), new THREE.Vector2(FOUNT.R - 0.9, FOUNT.rimH - 0.2), new THREE.Vector2(FOUNT.R - 0.9, 0)], 48);
    fb.add(stone, ring); fb.cyl(stoneD, FOUNT.R - 0.85, FOUNT.R - 0.85, 0.2, 0, 0.1, 0, { seg: 48 });
    fb.cyl(stone, 0.7, 1.0, 4.4, 0, 2.2, 0, { seg: 20 }); fb.add(stone, new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(2.4, 0.5), new THREE.Vector2(2.6, 0.9), new THREE.Vector2(2.3, 0.95), new THREE.Vector2(0.4, 0.5)], 32), 0, 4.1, 0);
    fb.cyl(stone, 0.35, 0.5, 1.6, 0, 5.4, 0, { seg: 14 }); fb.add(paint('#2fb2a0', { roughness: 0.4 }), new THREE.SphereGeometry(0.55, 16, 12), 0, 6.4, 0);
    fb.done(F); }
  const water = new THREE.Mesh(new THREE.CircleGeometry(FOUNT.R - 0.86, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4fb7e0', roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.85 })); water.position.y = FOUNT.waterY; water.receiveShadow = true; F.add(water); g.water = water;
  const bowlW = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2), water.material); bowlW.position.y = 4.95; F.add(bowlW);
  // the jets: four arcs of drops from the top ball into the bowl and over the bowl lip into the basin
  const jm = new THREE.MeshStandardMaterial({ color: '#d8f4ff', roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
  const jets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 5), jm, 320); jets.userData.noAO = true; F.add(jets); g.jets = jets;
  const M = new THREE.Matrix4(), Qn = new THREE.Quaternion(), S = v3(1, 1, 1);
  g.setJets = (t, speed = 1) => { for (let i = 0; i < 320; i++) { const k = i % 8, a = k * Math.PI / 4 + 0.2, ph = ((i / 320) * 7 + t * 0.9 * speed) % 1;
      let x, y; if (k % 2 === 0) { x = ph * 2.4; y = 6.6 + 1.2 * ph - 3.0 * ph * ph; } else { x = 2.6 + ph * 1.6; y = 5.0 - 3.9 * ph * ph; }
      S.setScalar(0.8 + (i % 3) * 0.3); M.compose(v3(Math.cos(a) * x, y, Math.sin(a) * x), Qn, S); jets.setMatrixAt(i, M); } jets.instanceMatrix.needsUpdate = true; };
  g.setJets(0);
  // picnic tables (long axis x): top 2.2, benches 1.3 either side at z +/- 2.3
  g.tables = [{ x: -17, z: 6 }, { x: 17, z: 4 }, { x: -15, z: 22 }, { x: 18, z: 21 }];
  const tm = paint('#3fa8e0', { roughness: 0.5 }), legM = paint('#5a5f68', { metalness: 0.6, roughness: 0.4 });
  g.tables.forEach(({ x, z }) => { b.box(tm, 9, 0.3, 3.0, x, 2.2, z, { r: 0.08 }); for (const s of [-1, 1]) { b.box(tm, 9, 0.25, 1.2, x, 1.3, z + s * 2.3, { r: 0.06 }); for (const e of [-1, 1]) { b.box(legM, 0.2, 2.2, 0.2, x + e * 3.8, 1.1, z + s * 0.9, { r: 0.04 }); b.box(legM, 0.2, 1.3, 0.2, x + e * 3.8, 0.65, z + s * 2.3, { r: 0.04 }); } } });
  // Hazel's bench (faces -z toward the fountain): seat 1.5 at z = 18, x = 4
  g.bench = { x: 4, z: 18.5, seatY: 1.5 };
  { const wd = paint('#c8935a', { roughness: 0.7 }); b.box(wd, 7, 0.25, 1.6, g.bench.x, 1.5, g.bench.z, { r: 0.06 }); b.box(wd, 7, 1.6, 0.2, g.bench.x, 2.6, g.bench.z + 0.85, { r: 0.06, rx: -0.12 }); for (const e of [-1, 1]) b.box(legM, 0.25, 1.5, 1.4, g.bench.x + e * 3.0, 0.75, g.bench.z, { r: 0.04 }); }
  // the dodgeball court: painted lines on the tiles to the east
  const lineM = paint('#ffffff', { roughness: 0.6 }); const C = { x: 38, z: 6, w: 18, d: 14 };
  g.add(flat(paint('#e8a04a', { roughness: 0.8 }), C.w, C.d, C.x, 0.015, C.z));
  for (const [w, d, x, z] of [[C.w, 0.25, C.x, C.z - C.d / 2], [C.w, 0.25, C.x, C.z + C.d / 2], [0.25, C.d, C.x - C.w / 2, C.z], [0.25, C.d, C.x + C.w / 2, C.z], [0.25, C.d, C.x, C.z]]) g.add(flat(lineM, w, d, x, 0.02, z));
  g.court = C;
  // trees, planters, lamps
  for (const [x, z] of [[-34, -14], [34, -14], [-40, 16], [-30, 34], [28, 36], [52, -10], [-52, 0]]) tree(b, x, z, 7 + r() * 3, ['#5fbf57', '#7ad06a', '#f6a9c4', '#4fae55'][Math.floor(r() * 4)]);
  for (const [x, z] of [[-24, -16], [24, -16], [-10, -18], [10, -18]]) { b.box(paint('#c8644a', { roughness: 0.7 }), 3.2, 1.4, 3.2, x, 0.7, z, { r: 0.1 }); b.add(paint('#4fae55', { roughness: 0.85 }), new THREE.IcosahedronGeometry(1.5, 1), x, 2.2, z); }
  for (const x of [-28, 28]) { const l = lamp({ height: 11, color: '#2a6fd8' }); l.position.set(x, 0, 30); l.rotation.y = x < 0 ? 0 : Math.PI; g.add(l); }
  // a low wall and the gate at the front edge (z = 48) so far shots have an edge
  b.box(paint('#c8644a', { roughness: 0.8 }), 120, 2.4, 1.2, 0, 1.2, 50, { r: 0.1 });
  b.done(g);
  return shadowAll(g);
}
