// Don't Picture Him (Flower Man remake 13): Bramblewick, where your daydreams float over your head in a bubble, and two hundred
// people picturing one thing make it real. Mister Stilts is the one thing nobody may picture.
//   bramblewick()      the bright town square: plaza, shops (.pizzaSign), the clock tower with the picture counter (.counter), the mayor's
//                      podium (.podium) and banner (.banner), the billboard (.billboard), Tess's flat-roofed house at the south edge
//                      (.house: .door, .ladder, .roofY, .upWin), a giant donut (.donut), party things (.party), lamps (.lamps)
//   stilts(o)          Mister Stilts: ten feet of green stilt legs, long arms, three long fingers, a head of a hundred blinking eyes.
//                      .pose(t, {...}) poses him (walk, tap, spin arms, reach), .look(p) aims every pupil, .tutu / .shoes (worn, .visible)
//   bubble(kind)       a daydream: an iridescent soap bubble with a little model in it and two trailing bubbles. .show(kind), .set(k, t), .face(campos)
//                      kinds: donut stilts tutu dino blob kitten pie car fish burger
//   counterPanel()     the tower's counter: .set(n, flash)
//   pizzaBox() blimp() megaphone() wearBasket(c) ladder() dreamscape() partyBalloons()
import * as THREE from 'three';
import { v3, rng, clamp } from './core.js';
import { Batch, surf, paint, lamp, sign, building } from './kit.js';
import { canvasTex, glowSprite } from './props.js';
import { makeClockTower } from './models.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh && !o.material.transparent) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
const noAO = (g) => { g.traverse((o) => { o.userData.noAO = true; }); return g; };
function flat(mat, w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8;
  for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
function partBox(group) { group.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3(); group.traverse((k) => { if (k.isMesh && !k.userData.worn) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } }); return bx; }
const worn = (g) => { g.traverse((o) => { if (o.isMesh) { o.userData.worn = true; o.castShadow = true; } }); return g; };

// ---------------- Mister Stilts ----------------
const GREEN = '#78d14c', DEEP = '#3d9a3a';
export function stilts(o = {}) {
  const g = new THREE.Group(), skin = paint(o.color || GREEN, { roughness: 0.5 }), deep = paint(o.deep || DEEP, { roughness: 0.55 }), knob = paint('#a6e86a', { roughness: 0.45 });
  const seg = (len, r0, r1, m) => { const q = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 12), m); q.position.y = -len / 2; q.castShadow = true; return q; };
  const ball = (r, m) => { const q = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); q.castShadow = true; return q; };
  const HIP = 6.2, TH = 3.1, SH = 3.1;
  const hips = new THREE.Group(); hips.position.y = HIP; g.add(hips); g.hips = hips;
  // the body: a pear, striped
  const body = new THREE.Group(); hips.add(body); g.body = body;
  { const lp = []; for (let i = 0; i <= 16; i++) { const u = i / 16, y = u * 2.9, r = 0.55 + 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.35); lp.push(new THREE.Vector2(Math.max(0.05, r * (u > 0.97 ? 0.4 : 1)), y)); }
    const m = new THREE.Mesh(new THREE.LatheGeometry(lp, 24), skin); m.position.y = -0.2; m.castShadow = true; body.add(m);
    for (const y of [0.55, 1.15, 1.75]) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.0 - (y - 0.55) * 0.2, 0.07, 6, 28), deep); t.rotation.x = Math.PI / 2; t.position.y = y; t.scale.set(1, 1, 1); body.add(t); }
    const belly = ball(0.5, knob); belly.position.set(0, 0.9, 0.62); belly.scale.set(1, 1.2, 0.5); body.add(belly); }
  // the neck and the head of eyes
  const neck = new THREE.Group(); neck.position.y = 2.6; body.add(neck); g.neck = neck;
  neck.add(Object.assign(seg(0.9, 0.22, 0.18, deep), {})); neck.children[0].position.y = 0.45;
  const head = new THREE.Group(); head.position.y = 1.9; neck.add(head); g.head = head;
  const HR = 1.25, hm = ball(HR, skin); hm.scale.set(1, 1.05, 0.98); head.add(hm);
  { const mo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), paint('#1d2a16', { roughness: 0.6 })); mo.scale.set(1.2, 0.55, 0.4); mo.position.set(0, -0.78, 1.0); head.add(mo); g.mouth = mo; }
  const N = o.eyes ?? 100, r = rng(o.seed || 13), eyes = [];
  for (let i = 0; i < N * 2 && eyes.length < N; i++) { const y = 1 - (i / (N * 2 - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963; const n = v3(Math.cos(th) * rad, y, Math.sin(th) * rad); if (n.y < -0.55 || (n.z > 0.55 && n.y < -0.35)) continue; eyes.push({ n, s: 0.13 + r() * 0.16, ph: r() * 9, per: 2.4 + r() * 3.5 }); }
  const EW = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), paint('#fffdf2', { roughness: 0.18 }), eyes.length), EP = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), paint('#141414', { roughness: 0.2 }), eyes.length), EI = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), paint(o.iris || '#ff9f1c', { roughness: 0.3 }), eyes.length);
  [EW, EP, EI].forEach((m) => { m.castShadow = false; head.add(m); });
  const M = new THREE.Matrix4(), Qn = new THREE.Quaternion(), Z = v3(0, 0, 1), S = v3(), P = v3(), gaze = v3(0, 0, 1);
  g.eyeOpen = 1;
  g.blinkEyes = (t) => {
    eyes.forEach((e, i) => {
      const bt = ((t + e.ph) % e.per), bl = bt < 0.16 ? Math.abs(bt - 0.08) / 0.08 : 1, op = clamp(bl * g.eyeOpen) * (e.open ?? 1);
      Qn.setFromUnitVectors(Z, e.n); P.copy(e.n).multiplyScalar(HR * 0.93); S.set(e.s, e.s * Math.max(0.05, op), e.s * 0.8);
      M.compose(P, Qn, S); EW.setMatrixAt(i, M);
      const gz = gaze.clone().applyQuaternion(Qn.clone().invert()); gz.z = 0; gz.multiplyScalar(0.38);
      const pp = v3(gz.x * e.s, gz.y * e.s * op, e.s * 0.72).applyQuaternion(Qn).add(P);
      S.set(e.s * 0.52, e.s * 0.52 * Math.max(0.02, op), e.s * 0.3); M.compose(pp, Qn, S); EI.setMatrixAt(i, M);
      S.set(e.s * 0.27, e.s * 0.27 * Math.max(0.02, op), e.s * 0.33); pp.add(e.n.clone().multiplyScalar(e.s * 0.06)); M.compose(pp, Qn, S); EP.setMatrixAt(i, op < 0.08 ? new THREE.Matrix4().makeScale(0, 0, 0) : M);
    });
    EW.instanceMatrix.needsUpdate = true; EP.instanceMatrix.needsUpdate = true; EI.instanceMatrix.needsUpdate = true;
  };
  g.eyes = eyes;
  g.look = (p) => { head.updateMatrixWorld(true); const l = head.worldToLocal(p.clone()); gaze.copy(l.normalize()); };
  g.lookDir = (d) => { gaze.copy(d).normalize(); };
  // the legs: hip ball, thigh, knob knee, shin, foot
  g.legs = []; g.knees = []; g.feet = [];
  for (const s of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(s * 0.42, 0, 0); hips.add(hp); hp.add(ball(0.32, deep));
    const th = seg(TH, 0.2, 0.26, skin); hp.add(th); for (const y of [-1.0, -2.0]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.16, 12), deep); st.position.y = y; hp.add(st); }
    const kn = new THREE.Group(); kn.position.y = -TH; hp.add(kn); kn.add(ball(0.3, knob));
    const sh = seg(SH, 0.16, 0.2, skin); kn.add(sh); for (const y of [-1.0, -2.0]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.16, 12), deep); st.position.y = y; kn.add(st); }
    const an = new THREE.Group(); an.position.y = -SH; kn.add(an);
    const ft = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), deep); ft.scale.set(0.75, 0.42, 1.35); ft.position.set(0, 0.12, 0.28); ft.castShadow = true; an.add(ft);
    // tap shoes (worn later)
    const sh2 = new THREE.Group(); const sm = paint('#121212', { roughness: 0.12, metalness: 0.3 }); const sb = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 10), sm); sb.scale.set(0.8, 0.46, 1.4); sb.position.set(0, 0.14, 0.3); sh2.add(sb);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.4), paint('#d9dde2', { metalness: 0.9, roughness: 0.2 })); tip.position.set(0, 0.0, 0.66); sh2.add(tip); const bow = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.05, 6, 12), paint('#ff5cc8', { roughness: 0.4 })); bow.position.set(0, 0.36, 0.5); bow.scale.set(1.6, 1, 1); sh2.add(bow); sh2.visible = false; an.add(sh2);
    g.legs.push(hp); g.knees.push(kn); g.feet.push(an); (g.shoeParts ||= []).push(sh2);
  }
  // the arms: shoulder at the top of the pear, upper, elbow, forearm, a hand of three long fingers
  g.arms = []; g.elbows = []; g.hands = []; g.fingers = [];
  for (const s of [-1, 1]) {
    const sp = new THREE.Group(); sp.position.set(s * 0.72, 2.25, 0); body.add(sp); sp.add(ball(0.24, deep));
    sp.add(seg(2.4, 0.13, 0.16, skin));
    const el = new THREE.Group(); el.position.y = -2.4; sp.add(el); el.add(ball(0.2, knob)); el.add(seg(2.3, 0.11, 0.13, skin));
    const hd = new THREE.Group(); hd.position.y = -2.3; el.add(hd); const palm = ball(0.24, deep); palm.scale.set(1, 1.1, 0.6); hd.add(palm);
    const fs = [];
    for (const k of [-1, 0, 1]) { const f = new THREE.Group(); f.position.set(k * 0.13, -0.12, 0); f.rotation.z = k * 0.18; hd.add(f); f.add(seg(1.0, 0.05, 0.07, skin)); const f2 = new THREE.Group(); f2.position.y = -1.0; f.add(f2); f2.add(seg(0.6, 0.035, 0.05, skin)); const tp = ball(0.06, knob); tp.position.y = -0.6; f2.add(tp); f.f2 = f2; fs.push(f); }
    g.arms.push(sp); g.elbows.push(el); g.hands.push(hd); g.fingers.push(fs);
  }
  // the tutu: three ruffled layers, sparkly
  { const tu = new THREE.Group(); tu.position.y = 0.05; hips.add(tu); g.tutu = tu; tu.visible = false;
    const cols = ['#ff5cc8', '#ff8ad8', '#ffb3ea'];
    for (let L = 0; L < 3; L++) { const R0 = 0.9, R1 = 2.3 - L * 0.35, n = 96, pos = [], idx = [];
      for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, w = 1 + 0.09 * Math.sin(a * 16 + L), y1 = -0.35 - 0.12 * Math.sin(a * 16 + L) ; pos.push(Math.cos(a) * R0, 0.25 + L * 0.06, Math.sin(a) * R0, Math.cos(a) * R1 * w, y1 + L * 0.1, Math.sin(a) * R1 * w); }
      for (let i = 0; i < n; i++) { const a0 = i * 2, b0 = i * 2 + 1, a1 = i * 2 + 2, b1 = i * 2 + 3; idx.push(a0, b0, a1, a1, b0, b1); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[L], roughness: 0.55, side: THREE.DoubleSide, emissive: cols[L], emissiveIntensity: 0.12 })); m.castShadow = true; tu.add(m); }
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.12, 8, 32), paint('#ff3fb4', { roughness: 0.35 })); band.rotation.x = Math.PI / 2; band.position.y = 0.3; tu.add(band);
    const sp = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6fb').multiplyScalar(2.2) }), 90), M2 = new THREE.Matrix4(), rr = rng(5);
    for (let i = 0; i < 90; i++) { const a = rr() * 6.283, d = 1.0 + rr() * 1.2; M2.makeRotationY(rr() * 3); M2.setPosition(Math.cos(a) * d, 0.12 - (d - 1) * 0.3 + 0.05, Math.sin(a) * d); sp.setMatrixAt(i, M2); } sp.userData.noAO = true; tu.add(sp); }
  g.shoes = { set visible(v) { g.shoeParts.forEach((s, i) => { s.visible = v; }); g.feet.forEach((f) => { f.children[0].visible = !v; }); }, get visible() { return g.shoeParts[0].visible; } };
  g.reset = () => { g.hips.position.set(0, HIP, 0); g.hips.rotation.set(0, 0, 0); body.rotation.set(0, 0, 0); neck.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0);
    g.legs.forEach((l, i) => l.rotation.set(0, 0, 0)); g.knees.forEach((k) => k.rotation.set(0, 0, 0)); g.feet.forEach((k) => k.rotation.set(0, 0, 0));
    g.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? 1 : -1) * 0.12)); g.elbows.forEach((e) => e.rotation.set(-0.15, 0, 0)); g.hands.forEach((h) => h.rotation.set(0, 0, 0));
    g.fingers.forEach((fs) => fs.forEach((f, k) => { f.rotation.set(-0.1, 0, (k - 1) * 0.18); f.f2.rotation.set(-0.35, 0, 0); })); };
  // poses: o.walk (phase), o.tap (0-1 amount), o.arms 'up' | 'wide' | 'hang', o.lean, o.reach (world point for the right hand, with o.tapK for the finger)
  g.pose = (t, q = {}) => {
    g.reset(); const sway = Math.sin(t * 1.3) * 0.04;
    body.rotation.z = sway * 0.5; neck.rotation.z = -sway; head.rotation.x = 0.08;
    g.arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 1.1 + i) * 0.06; });
    g.fingers.forEach((fs, i) => fs.forEach((f, k) => { f.f2.rotation.x = -0.3 - 0.25 * Math.max(0, Math.sin(t * 2.3 + k + i)); }));
    if (q.walk !== undefined) { const p = q.walk, A = 0.55; g.legs[0].rotation.x = Math.sin(p) * A; g.legs[1].rotation.x = -Math.sin(p) * A; g.knees[0].rotation.x = Math.max(0, Math.sin(p - 1.2)) * 0.8; g.knees[1].rotation.x = Math.max(0, -Math.sin(p - 1.2)) * 0.8; g.hips.position.y = HIP + Math.abs(Math.cos(p)) * 0.15 - 0.1; g.arms[0].rotation.x = -Math.sin(p) * 0.4; g.arms[1].rotation.x = Math.sin(p) * 0.4; }
    if (q.tap) { const k = q.tap, f = q.tapRate ?? 9, ph = t * f; const up = (x) => Math.max(0, Math.sin(x));
      g.legs[0].rotation.x = -up(ph) * 0.9 * k; g.knees[0].rotation.x = up(ph) * 1.6 * k; g.feet[0].rotation.x = -up(ph) * 0.5 * k;
      g.legs[1].rotation.x = -up(ph + Math.PI) * 0.9 * k; g.knees[1].rotation.x = up(ph + Math.PI) * 1.6 * k; g.feet[1].rotation.x = -up(ph + Math.PI) * 0.5 * k;
      g.legs[0].rotation.z = -0.12 * k; g.legs[1].rotation.z = 0.12 * k;
      g.hips.position.y = HIP - 0.35 * k + Math.abs(Math.sin(ph)) * 0.25 * k; body.rotation.z = Math.sin(ph) * 0.12 * k; head.rotation.z = -Math.sin(ph) * 0.15 * k; }
    if (q.arms === 'wide') { const k = q.armK ?? 1; g.arms[0].rotation.z = -1.45 * k + Math.sin(t * 6) * 0.25 * k; g.arms[1].rotation.z = 1.45 * k - Math.sin(t * 6 + 1) * 0.25 * k; g.elbows.forEach((e, i) => { e.rotation.z = (i ? 1 : -1) * 0.6 * k; e.rotation.x = 0; }); g.hands.forEach((h) => { h.rotation.z = Math.sin(t * 9) * 0.4 * k; }); }
    if (q.arms === 'up') { const k = q.armK ?? 1; g.arms[0].rotation.z = -2.7 * k; g.arms[1].rotation.z = 2.7 * k; g.elbows.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * 0.9 * k; e.rotation.x = 0; }); }
    if (q.arms === 'creep') { const k = q.armK ?? 1; g.arms.forEach((a, i) => { a.rotation.x = -0.9 * k; a.rotation.z = (i ? 1 : -1) * 0.35 * k; }); g.elbows.forEach((e) => { e.rotation.x = -0.9 * k; }); g.fingers.forEach((fs) => fs.forEach((f, j) => { f.rotation.x = -0.4 * k; f.f2.rotation.x = -0.9 * k + Math.sin(t * 5 + j) * 0.2; })); }
    if (q.lean) body.rotation.x = q.lean;
    if (q.bow) { body.rotation.x = q.bow; head.rotation.x = q.bow * 0.3; }
    if (q.headTilt) head.rotation.z = q.headTilt;
    if (q.reach) { g.updateMatrixWorld(true); aimLimb(g.arms[1], q.reach, g.elbows[1]); const tk = q.tapK ?? 0; g.fingers[1].forEach((f, j) => { f.rotation.x = j === 1 ? -0.1 - 0.5 * tk : 0.9; f.f2.rotation.x = j === 1 ? -0.2 : -1.4; }); }
    g.blinkEyes(t);
  };
  g.HIP = HIP; g.HEIGHT = HIP + 2.6 + 1.9 + HR * 1.05 + 0.2;
  shadowAll(g); g.traverse((x) => { if (x.isInstancedMesh) x.castShadow = false; });
  g.reset();
  return g;
}
// point an upper arm (hanging along -y) at a world point, elbow straight
function aimLimb(sp, world, el) { el.rotation.set(0, 0, 0); sp.rotation.set(0, 0, 0); sp.updateMatrixWorld(true); const pw = sp.parent.matrixWorld, sh = v3().setFromMatrixPosition(sp.matrixWorld), q = new THREE.Quaternion(), pp = v3(), ps = v3(); pw.decompose(pp, q, ps); const d = world.clone().sub(sh).applyQuaternion(q.clone().invert()).normalize(); sp.quaternion.setFromUnitVectors(v3(0, -1, 0), d); }

// ---------------- the daydream bubble ----------------
const BUBBLE_VS = `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const BUBBLE_FS = `uniform float uK; varying vec3 vN; varying vec3 vV;
  void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float r = pow(f, 2.2);
    vec3 c = mix(vec3(0.55, 0.95, 1.0), vec3(1.0, 0.6, 0.95), 0.5 + 0.5 * vN.y); c = mix(c, vec3(1.0, 0.95, 0.6), 0.35 * (0.5 + 0.5 * vN.x));
    float hl = smoothstep(0.86, 0.97, dot(normalize(vN), normalize(vec3(-0.45, 0.6, 0.66))));
    gl_FragColor = vec4(c * (0.6 + 0.8 * r) + vec3(1.0) * hl, (0.08 + 0.75 * r + 0.8 * hl) * uK); }`;
function bubbleMat() { return new THREE.ShaderMaterial({ uniforms: { uK: { value: 1 } }, vertexShader: BUBBLE_VS, fragmentShader: BUBBLE_FS, transparent: true, depthWrite: false, fog: false }); }
function miniModel(kind) {
  const g = new THREE.Group(), b = new Batch();
  if (kind === 'stilts' || kind === 'tutu') { const s = stilts({ eyes: 34, seed: 7 }); s.scale.setScalar(0.175); s.position.y = -1.05; if (kind === 'tutu') { s.tutu.visible = true; s.shoes.visible = true; } g.add(s); g.mon = s; g.kind = kind; return g; }
  if (kind === 'donut') { const d = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.3, 14, 30), paint('#e3a05a', { roughness: 0.6 })); const ic = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.31, 14, 30, Math.PI * 2), paint('#ff7ab6', { roughness: 0.35 })); ic.scale.set(1, 1, 0.55); ic.position.z = 0.1; g.add(d, ic); const r = rng(3); for (let i = 0; i < 18; i++) { const a = r() * 6.28, s = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.1, 2, 4), paint(['#fff', '#ffd23f', '#3fb7ff', '#7cff6a'][i % 4])); s.position.set(Math.cos(a) * (0.62 + (r() - 0.5) * 0.3), Math.sin(a) * (0.62 + (r() - 0.5) * 0.3), 0.3); s.rotation.z = r() * 3; g.add(s); } g.rotation.x = -0.3; }
  else if (kind === 'dino') { const m = paint('#5fd06a', { roughness: 0.5 }); b.add(m, new THREE.SphereGeometry(0.5, 14, 10).scale(1.2, 0.9, 0.9), 0, 0, 0); b.add(m, new THREE.SphereGeometry(0.32, 12, 8), 0.62, 0.42, 0); b.add(m, new THREE.ConeGeometry(0.18, 0.7, 8).rotateZ(Math.PI / 2), -0.8, -0.05, 0); for (let i = 0; i < 4; i++) b.add(paint('#ffd23f'), new THREE.ConeGeometry(0.08, 0.22, 6), -0.3 + i * 0.22, 0.45 - Math.abs(i - 1.5) * 0.02, 0); for (const x of [-0.25, 0.3]) b.add(m, new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8), x, -0.5, 0); b.add(paint('#ffffff'), new THREE.SphereGeometry(0.08, 8, 6), 0.78, 0.52, 0.18); b.add(paint('#111'), new THREE.SphereGeometry(0.04, 6, 4), 0.83, 0.53, 0.24); b.done(g); g.rotation.y = -0.5; }
  else if (kind === 'blob') { const m = paint('#9b6bff', { roughness: 0.4 }); b.add(m, new THREE.SphereGeometry(0.6, 16, 12).scale(1, 0.85, 0.9), 0, 0, 0); for (const s of [-1, 1]) { b.add(paint('#ffe37a'), new THREE.ConeGeometry(0.1, 0.35, 8), s * 0.3, 0.6, 0); b.add(paint('#ffffff'), new THREE.SphereGeometry(0.15, 10, 8), s * 0.2, 0.15, 0.48); b.add(paint('#111'), new THREE.SphereGeometry(0.07, 8, 6), s * 0.2, 0.15, 0.6); } b.add(paint('#ffffff'), new THREE.ConeGeometry(0.06, 0.14, 6).rotateX(Math.PI), -0.12, -0.18, 0.5); b.add(paint('#ffffff'), new THREE.ConeGeometry(0.06, 0.14, 6).rotateX(Math.PI), 0.12, -0.18, 0.5); b.done(g); }
  else if (kind === 'kitten') { const m = paint('#f6a64a', { roughness: 0.7 }); b.add(m, new THREE.SphereGeometry(0.5, 14, 10).scale(1.1, 0.8, 0.8), 0, -0.25, 0); b.add(m, new THREE.SphereGeometry(0.4, 14, 10), 0, 0.35, 0.15); for (const s of [-1, 1]) { b.add(m, new THREE.ConeGeometry(0.13, 0.3, 4), s * 0.22, 0.72, 0.12); b.add(paint('#111'), new THREE.SphereGeometry(0.06, 8, 6), s * 0.14, 0.4, 0.5); } b.add(paint('#ff8aa8'), new THREE.SphereGeometry(0.05, 8, 6), 0, 0.3, 0.55); b.done(g); }
  else if (kind === 'pie') { b.cyl(paint('#d9964a', { roughness: 0.6 }), 0.75, 0.6, 0.35, 0, 0, 0, { seg: 24 }); b.cyl(paint('#c43a4a', { roughness: 0.4 }), 0.66, 0.66, 0.1, 0, 0.17, 0, { seg: 24 }); b.done(g); g.rotation.x = 0.6; }
  else if (kind === 'car') { b.box(paint('#ff4f6a', { roughness: 0.35 }), 1.5, 0.45, 0.7, 0, 0, 0, { r: 0.12 }); b.box(paint('#ff4f6a', { roughness: 0.35 }), 0.8, 0.4, 0.65, -0.1, 0.38, 0, { r: 0.1 }); b.box(paint('#bfe6ff', { roughness: 0.1 }), 0.7, 0.3, 0.67, -0.1, 0.4, 0, { r: 0.06 }); for (const x of [-0.5, 0.5]) for (const z of [-0.36, 0.36]) b.cyl(paint('#222'), 0.2, 0.2, 0.15, x, -0.22, z, { seg: 12, rx: Math.PI / 2 }); b.done(g); g.rotation.y = 0.5; }
  else if (kind === 'fish') { const m = paint('#3fb7ff', { roughness: 0.3 }); b.add(m, new THREE.SphereGeometry(0.45, 14, 10).scale(1.3, 0.8, 0.5), 0, 0, 0); b.add(paint('#ffd23f'), new THREE.ConeGeometry(0.3, 0.45, 4).rotateZ(Math.PI / 2), -0.75, 0, 0); b.add(paint('#111'), new THREE.SphereGeometry(0.06, 8, 6), 0.38, 0.1, 0.2); b.done(g); }
  else if (kind === 'burger') { b.cyl(paint('#e3a457'), 0.62, 0.6, 0.3, 0, 0.3, 0, { seg: 20 }); b.cyl(paint('#6b3a22'), 0.64, 0.64, 0.2, 0, 0.05, 0, { seg: 20 }); b.cyl(paint('#6ad04a'), 0.7, 0.7, 0.06, 0, 0.17, 0, { seg: 20 }); b.cyl(paint('#e3a457'), 0.6, 0.62, 0.2, 0, -0.18, 0, { seg: 20 }); b.done(g); g.rotation.x = 0.35; }
  g.kind = kind; return shadowAll(g);
}
export function bubble(kind = 'donut', o = {}) {
  const g = new THREE.Group(), R = o.r ?? 1.5, mat = bubbleMat();
  const big = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), mat); big.renderOrder = 5; g.add(big);
  const t1 = new THREE.Mesh(new THREE.SphereGeometry(R * 0.24, 16, 12), mat), t2 = new THREE.Mesh(new THREE.SphereGeometry(R * 0.14, 12, 8), mat);
  t1.position.set(-R * 0.35, -R * 1.32, 0); t2.position.set(-R * 0.55, -R * 1.78, 0); t1.renderOrder = t2.renderOrder = 5; g.add(t1, t2);
  const hold = new THREE.Group(); hold.scale.setScalar(R / 1.5); g.add(hold); g.hold = hold;
  const cache = {}; g.content = null;
  g.show = (k) => { if (g.content && g.content.kind === k) return; if (g.content) g.content.visible = false; if (!k) { g.content = null; return; } if (!cache[k]) { cache[k] = miniModel(k); hold.add(cache[k]); } g.content = cache[k]; g.content.visible = true; };
  g.show(kind);
  g.mat = mat; noAO(g);
  // k: 0 gone -> 1 shown (pops with an overshoot); t for the bob and spin
  g.set = (k, t = 0) => { g.visible = k > 0.002; const s = k < 1 ? (k < 0.7 ? k / 0.7 * 1.12 : 1.12 - (k - 0.7) / 0.3 * 0.12) : 1; g.scale.setScalar(Math.max(0.001, s) * (o.scale ?? 1)); big.position.y = Math.sin(t * 1.7) * 0.06; hold.position.y = big.position.y; if (g.content) { g.content.rotation.y = (g.content.kind === 'stilts' || g.content.kind === 'tutu') ? Math.sin(t * 0.8) * 0.5 : t * 0.7; if (g.content.mon) { g.content.mon.pose(t, g.content.kind === 'tutu' ? { tap: 1, arms: 'wide', tapRate: 7 } : { arms: 'creep', armK: 0.6 }); } } mat.uniforms.uK.value = Math.min(1, k * 1.5); };
  g.face = (cam) => { g.rotation.y = Math.atan2(cam.x - g.position.x, cam.z - g.position.z); };
  return g;
}

// ---------------- the picture counter on the clock tower ----------------
export function counterPanel(w = 7.6, h = 7.6) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.userData.noAO = true;
  let last = '';
  m.set = (n, flash = 0) => {
    const key = n + ':' + (flash > 0.5 ? 1 : 0); if (key === last) return; last = key;
    const x = c.getContext('2d'), W = 512, H = 512, hot = flash > 0.5;
    x.fillStyle = hot ? '#ff3b5c' : '#16203a'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#ffd23f'; x.lineWidth = 14; x.strokeRect(14, 14, W - 28, H - 28);
    x.fillStyle = hot ? '#fff3c4' : '#ffd23f'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 46px ITTInter, sans-serif'; x.fillText('PICTURING HIM', W / 2, 76);
    x.font = '900 210px ITTInter, sans-serif'; x.fillStyle = hot ? '#ffffff' : n >= 150 ? '#ff5468' : n >= 40 ? '#ffb13b' : '#7dff8a'; x.fillText(String(n).padStart(3, '0'), W / 2, 248);
    x.font = '900 52px ITTInter, sans-serif'; x.fillStyle = hot ? '#fff3c4' : '#ffd23f'; x.fillText('OF 200', W / 2, 368);
    x.fillStyle = '#2b3656'; x.fillRect(56, 410, W - 112, 46); x.fillStyle = hot ? '#ffffff' : n >= 150 ? '#ff5468' : '#ffb13b'; x.fillRect(56, 410, (W - 112) * Math.min(1, n / 200), 46);
    tex.needsUpdate = true;
  };
  m.set(0); return m;
}

// ---------------- props ----------------
function textTex(w, h, draw) { return canvasTex(w, h, draw); }
export function pizzaBox(o = {}) {
  const g = new THREE.Group(), W = o.w ?? 2.6, H = 0.42, card = paint('#f2e3c6', { roughness: 0.85 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(W, H, W), card); base.position.y = H / 2; base.castShadow = true; g.add(base);
  const lidTex = textTex(512, 512, (x, w, h) => { x.fillStyle = '#fff7ea'; x.fillRect(0, 0, w, h); x.fillStyle = '#e2263a'; x.fillRect(0, 0, w, 120); x.fillStyle = '#ffffff'; x.font = '900 64px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('PIZZA PALACE', w / 2, 82); x.fillStyle = '#e2263a'; x.font = '900 66px ITTInter, sans-serif'; ['DON\'T', 'PICTURE', 'MISTER', 'STILTS!'].forEach((l, i) => x.fillText(l, w / 2, 200 + i * 78)); x.strokeStyle = '#e2263a'; x.lineWidth = 10; x.strokeRect(30, 140, w - 60, h - 170); });
  const lid = new THREE.Group(); lid.position.set(0, H, -W / 2); g.add(lid); g.lid = lid;
  const lm = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, W), [card, card, new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.8 }), card, card, card]); lm.position.set(0, 0.03, W / 2); lm.castShadow = true; lid.add(lm);
  return g;
}
export function blimp() {
  const g = new THREE.Group(), b = new Batch(), hull = paint('#d9e4f2', { roughness: 0.35, metalness: 0.1 }), red = paint('#e2263a', { roughness: 0.45 });
  b.add(hull, new THREE.SphereGeometry(1, 32, 20).scale(10, 3.4, 3.4), 0, 0, 0);
  for (const [ry, rz] of [[0, 0], [0, Math.PI], [Math.PI / 2, 0], [Math.PI / 2, Math.PI]]) { const f = new THREE.BoxGeometry(3.2, 3.0, 0.25); f.translate(0, 1.6, 0); f.rotateZ(rz); f.rotateX(ry); b.add(red, f, -8.6, 0, 0); }
  b.box(paint('#3a4552', { roughness: 0.4 }), 3.4, 1.1, 1.4, 0.5, -3.6, 0, { r: 0.3 });
  b.done(g);
  for (const s of [-1, 1]) { const t = sign('DON\'T PICTURE MISTER STILTS!', { w: 14, h: 2.2, bg: '#e2263a', fg: '#ffffff', edge: '#ffffff', frame: '#e2263a' }); t.position.set(0.5, 0, s * 3.32); t.rotation.y = s > 0 ? 0 : Math.PI; t.scale.set(1, 1, 0.3); g.add(t); }
  return shadowAll(g);
}
export function megaphone() {
  const g = new THREE.Group(), b = new Batch();
  const cone = new THREE.CylinderGeometry(0.16, 0.62, 1.6, 22, 1, true); cone.rotateX(Math.PI / 2); b.add(paint('#ffffff', { roughness: 0.4, side: THREE.DoubleSide }), cone, 0, 0, 0.8);
  const rim = new THREE.TorusGeometry(0.62, 0.06, 8, 24); b.add(paint('#e2263a', { roughness: 0.4 }), rim, 0, 0, 1.6);
  b.cyl(paint('#e2263a', { roughness: 0.4 }), 0.2, 0.2, 0.5, 0, 0, -0.1, { seg: 14, rx: Math.PI / 2 });
  b.box(paint('#3a3d44', { roughness: 0.5 }), 0.18, 0.6, 0.22, 0, -0.38, 0.2, { r: 0.05 });
  b.done(g); return shadowAll(g);
}
export function wearBasket(c) {
  const B = partBox(c.head), w = Math.max(B.max.x - B.min.x, B.max.z - B.min.z), R = w * 0.6, hh = w * 0.5, g = new THREE.Group();
  const tex = canvasTex(256, 128, (x, W, H) => { x.fillStyle = '#7ec8f2'; x.fillRect(0, 0, W, H); x.clearRect(0, 0, 0, 0); for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) x.clearRect(6 + i * 21, 24 + j * 30, 12, 18); });
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(2, 1);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.92, R, hh, 28, 1, true), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45 }));
  const top = new THREE.Mesh(new THREE.CircleGeometry(R * 0.92, 28), paint('#7ec8f2', { roughness: 0.45, side: THREE.DoubleSide })); top.rotation.x = -Math.PI / 2; top.position.y = hh / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 6, 32), paint('#5aa8d8', { roughness: 0.4 })); rim.rotation.x = Math.PI / 2; rim.position.y = -hh / 2;
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 12, Math.PI), paint('#5aa8d8')); h.position.set(s * R * 0.96, hh * 0.15, 0); h.rotation.y = Math.PI / 2; h.rotation.z = Math.PI; g.add(h); }
  g.add(side, top, rim);
  g.position.set((B.min.x + B.max.x) / 2, B.max.y + hh * 0.3, (B.min.z + B.max.z) / 2); c.head.add(worn(g)); g.visible = false; g.R = R; g.hh = hh; return g;
}
export function ladder(h = 14) {
  const b = new Batch(), m = paint('#d9dde2', { metalness: 0.6, roughness: 0.35 }); for (const x of [-0.9, 0.9]) b.box(m, 0.18, h, 0.28, x, h / 2, 0, { r: 0.04 }); for (let y = 1; y < h; y += 1.4) b.box(m, 1.8, 0.14, 0.2, 0, y, 0, { r: 0.04 }); return shadowAll(b.done());
}
export function partyBalloons(seed = 4) {
  const g = new THREE.Group(), r = rng(seed), cols = ['#ff5c7a', '#ffd23f', '#3fb7ff', '#7cdf5a', '#b07cff', '#ff9a3c'];
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), paint(cols[i % 6], { roughness: 0.25 })); b.scale.set(1, 1.18, 1); const a = i / 6 * 6.28; b.position.set(Math.cos(a) * 0.9, 4 + r() * 1.4, Math.sin(a) * 0.9); g.add(b); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, b.position.y, 4), paint('#ffffff')); s.position.set(b.position.x / 2, b.position.y / 2, b.position.z / 2); s.lookAt(b.position); s.rotateX(Math.PI / 2); g.add(s); }
  return shadowAll(g);
}
// a giant donut, for the rule: two hundred people pictured one
export function bigDonut(R = 5) {
  const g = new THREE.Group(), d = new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.5, 22, 48), paint('#e3a05a', { roughness: 0.6 })); d.rotation.x = Math.PI / 2; d.position.y = R * 0.5; g.add(d);
  const ic = new THREE.Mesh(new THREE.TorusGeometry(R, R * 0.51, 22, 48), paint('#ff7ab6', { roughness: 0.35 })); ic.rotation.x = Math.PI / 2; ic.scale.set(1, 1, 0.6); ic.position.y = R * 0.62; g.add(ic);
  const r = rng(8); for (let i = 0; i < 60; i++) { const a = r() * 6.28, rr = R + (r() - 0.5) * R * 0.75, s = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 2, 6), paint(['#ffffff', '#ffd23f', '#3fb7ff', '#7cff6a', '#ff4f6a'][i % 5], { roughness: 0.4 })); s.position.set(Math.cos(a) * rr, R * 0.62 + R * 0.31 * Math.sqrt(Math.max(0, 1 - Math.pow((rr - R) / (R * 0.5), 2))) + 0.05, Math.sin(a) * rr); s.rotation.set(Math.PI / 2, 0, r() * 3); g.add(s); }
  return shadowAll(g);
}

// ---------------- the imagination: where Mister Stilts lives when nobody pictures him ----------------
export function dreamscape() {
  const g = new THREE.Group();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, toneMapped: false, map: canvasTex(64, 256, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a0b3a'); gr.addColorStop(0.45, '#4a1d7a'); gr.addColorStop(0.55, '#b44fa8'); gr.addColorStop(1, '#2a0f4a'); x.fillStyle = gr; x.fillRect(0, 0, W, H); }) }));
  g.add(sky); sky.userData.noAO = true;
  const fl = new THREE.Mesh(new THREE.CircleGeometry(300, 64), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(512, 512, (x, W, H) => { x.fillStyle = '#3a1a5e'; x.fillRect(0, 0, W, H); const r = rng(2); for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(${180 + r() * 70},${90 + r() * 80},255,0.35)`; x.lineWidth = 3 + r() * 6; x.beginPath(); x.arc(W / 2, H / 2, 10 + i * 6.5, r() * 6, r() * 6 + 2 + r() * 3); x.stroke(); } }) }));
  fl.rotation.x = -Math.PI / 2; fl.material.map.repeat.set(1, 1); fl.receiveShadow = true; g.add(fl);
  // floating little daydream bubbles in the purple
  const r = rng(21); g.floaters = [];
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3 + r() * 0.9, 18, 12), bubbleMat()); m.position.set((r() - 0.5) * 60, 2 + r() * 22, -10 - r() * 40); m.userData.ph = r() * 6; g.add(m); g.floaters.push(m); }
  noAO(g); fl.userData.noAO = false;
  g.update = (t) => { g.floaters.forEach((m) => { m.position.y += Math.sin(t * 0.7 + m.userData.ph) * 0.004; }); };
  return g;
}

// ---------------- Tess's house: two floors, a flat roof deck with a low wall, the door facing -z ----------------
function tessHouse() {
  const g = new THREE.Group(), b = new Batch(), W = 18, D = 14, H = 15, wall = surf('stucco', '#ffcf9a'), trim = paint('#fffaf0', { roughness: 0.5 }), roofM = surf('concrete', '#c9b8a6');
  b.box(wall, W, H, D, 0, H / 2, 0, { r: 0.12 });
  b.box(roofM, W + 0.4, 0.4, D + 0.4, 0, H + 0.2, 0, { r: 0.05 });
  for (const [w, d, x, z] of [[W + 0.6, 0.5, 0, -D / 2], [W + 0.6, 0.5, 0, D / 2], [0.5, D + 0.6, -W / 2, 0], [0.5, D + 0.6, W / 2, 0]]) b.box(trim, w, 1.5, d, x, H + 0.95, z, { r: 0.08 });
  b.box(trim, W + 0.5, 0.4, D + 0.5, 0, 7.6, 0, { r: 0.08 });
  // the front (-z): door, porch, windows
  b.box(paint('#3f8fd9', { roughness: 0.4 }), 3.6, 0.1, 0.1, -3, 0, -D / 2 - 0.01);
  const glass = paint('#9fd2f2', { roughness: 0.1, metalness: 0.3 }), shut = paint('#3f8fd9', { roughness: 0.5 });
  for (const [x, y] of [[4.5, 4], [-4.5, 11.0], [4.5, 11.0]]) { b.box(trim, 3.8, 3.6, 0.3, x, y, -D / 2 - 0.05, { r: 0.05 }); b.box(glass, 3.2, 3.0, 0.2, x, y, -D / 2 - 0.12, { r: 0.02 }); b.box(trim, 3.2, 0.14, 0.24, x, y, -D / 2 - 0.2); b.box(trim, 0.14, 3.0, 0.24, x, y, -D / 2 - 0.2); for (const s of [-1, 1]) b.box(shut, 1.0, 3.6, 0.2, x + s * 2.5, y, -D / 2 - 0.12, { r: 0.04 }); b.box(trim, 4.2, 0.3, 0.7, x, y - 1.95, -D / 2 - 0.3, { r: 0.05 }); }
  // the doorway frame
  const DX = -3.5; b.box(trim, 4.6, 8.4, 0.3, DX, 4.2, -D / 2 - 0.08, { r: 0.05 });
  b.box(surf('plank', '#d9c3a0'), 10, 0.6, 5, DX + 0.5, 0.3, -D / 2 - 2.5, { r: 0.06 }); b.box(surf('plank', '#d9c3a0'), 10, 0.3, 1.6, DX + 0.5, 0.15, -D / 2 - 5.6, { r: 0.05 });
  for (const x of [DX - 4.2, DX + 5.2]) b.box(trim, 0.45, 7.4, 0.45, x, 4.0, -D / 2 - 4.6, { r: 0.06 }); b.box(paint('#3f8fd9', { roughness: 0.45 }), 11, 0.4, 5.6, DX + 0.5, 7.9, -D / 2 - 2.6, { r: 0.08 });
  b.box(paint('#e45a7a', { roughness: 0.9 }), 3.4, 0.06, 2.0, DX, 0.63, -D / 2 - 1.4, { r: 0.04 });
  // bushes and the house number
  for (const [x, s] of [[6.5, 1.8], [8.6, 1.5], [-9.2, 1.6]]) b.add(paint('#4fae55', { roughness: 0.85 }), new THREE.IcosahedronGeometry(s, 2), x, s * 0.7, -D / 2 - 1.6);
  b.done(g);
  // the door: hinged at its +x edge
  const dg = new THREE.Group(); dg.position.set(DX + 1.85, 0.6, -D / 2 - 0.05); g.add(dg); g.door = dg;
  { const d2 = new Batch(); d2.box(paint('#e2456a', { roughness: 0.4 }), 3.6, 7.4, 0.3, -1.8, 3.7, 0, { r: 0.06 }); d2.box(paint('#ffd23f', { metalness: 0.7, roughness: 0.3 }), 0.25, 0.25, 0.4, -3.2, 3.6, -0.2, { r: 0.08 }); for (const y of [2.2, 5.4]) d2.box(paint('#c73a5c', { roughness: 0.45 }), 2.6, 2.4, 0.36, -1.8, y, 0, { r: 0.05 }); d2.done(dg); }
  g.doorAt = v3(DX, 0.6, -D / 2);
  { const dw = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 7.4), new THREE.MeshBasicMaterial({ color: '#2a1d18' })); dw.position.set(DX + 0.05, 0.6 + 3.7, -D / 2 - 0.03); dw.rotation.y = Math.PI; dw.userData.noAO = true; g.add(dw); g.doorway = dw; }
  // the upstairs window that glows at night (left, -4.5, 11)
  const up = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.0), new THREE.MeshStandardMaterial({ color: '#2a2f3a', emissive: '#ffcf7a', emissiveIntensity: 0, roughness: 0.3 })); up.position.set(-4.5, 11.0, -D / 2 - 0.24); up.rotation.y = Math.PI; g.add(up); g.upWin = up;
  // the ladder on the right side of the front
  const ld = ladder(H + 2.2); ld.position.set(8.0, 0, -D / 2 - 2.4); ld.rotation.x = 0.12; g.add(ld); g.ladder = ld; g.ladderAt = v3(8.0, 0, -D / 2 - 2.4); g.ladderLen = H + 2.2; g.ladderTilt = 0.12;
  g.roofY = H + 0.4; g.W = W; g.D = D; g.H = H;
  return shadowAll(g);
}

// ---------------- the square ----------------
export const TOWER = v3(0, 0, -50), HOUSE = v3(0, 0, 50), PODIUM = v3(0, 0, -34), DONUT = v3(-24, 0, -22), BILL = v3(28, 0, 30), PIZZA = v3(38, 0, -8);
export function bramblewick() {
  const g = new THREE.Group(), b = new Batch(), r = rng(113);
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14; g.add(flat(grass, 1400, 1400, 0, -0.06, 0));
  const tile = surf('tile', '#f2e2c8'); tile.userData.span = 6; g.add(flat(tile, 96, 120, 0, 0.0, 0));
  // a ring path and a round flower bed in the middle
  { const ring = new THREE.Mesh(new THREE.RingGeometry(9, 11, 64), paint('#e8b98a', { roughness: 0.8 })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.03, -6); ring.receiveShadow = true; g.add(ring); }
  b.cyl(paint('#c98a56', { roughness: 0.7 }), 4.4, 4.6, 0.8, -0, 0.4, -6, { seg: 36 }); b.cyl(surf('grass', '#5fbf57'), 4.1, 4.1, 0.1, 0, 0.82, -6, { seg: 36 });
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = r() * 3.6; b.add(paint(['#ff5c7a', '#ffd23f', '#ffffff', '#b07cff'][i % 4], { roughness: 0.6 }), new THREE.IcosahedronGeometry(0.32, 1), Math.cos(a) * d, 1.15, -6 + Math.sin(a) * d); }
  // the clock tower, its clock swapped for the counter
  const tw = makeClockTower(); tw.scale.setScalar(0.42); tw.position.copy(TOWER); g.add(tw); tw.clock.g.visible = false; g.tower = tw;
  const cp = counterPanel(7.9, 7.9); cp.position.set(TOWER.x, 54 * 0.42, TOWER.z + 11.15 * 0.42 + 0.06); g.add(cp); g.counter = cp; g.counterAt = cp.position.clone();
  // the mayor's banner and podium
  { const bn = sign('DO NOT PICTURE\nMISTER STILTS', { w: 12, h: 4.2, bg: '#e2263a', fg: '#ffffff', edge: '#ffffff', frame: '#ffffff' }); bn.position.set(TOWER.x, 9.6, TOWER.z + 5.0); g.add(bn); g.banner = bn; bn.visible = false; }
  { const p = new THREE.Group(), pb = new Batch(); pb.box(surf('plank', '#8a5a34'), 3.6, 4.2, 2.2, 0, 2.1, 0, { r: 0.12 }); pb.box(paint('#2f4f8f', { roughness: 0.6 }), 3.0, 2.2, 0.1, 0, 2.6, 1.12, { r: 0.04 }); pb.box(surf('plank', '#a06a40'), 4.0, 0.3, 2.6, 0, 4.3, -0.1, { r: 0.08, rx: -0.15 }); for (const s of [-1.6, 1.6]) { pb.cyl(paint('#2a2d33', { metalness: 0.5 }), 0.04, 0.04, 0.9, s, 4.75, 0.2, { seg: 6, rx: 0.4 }); pb.add(paint('#1b1d22', { roughness: 0.4 }), new THREE.SphereGeometry(0.2, 12, 8).scale(1, 1.3, 1), s, 5.15, 0.4); } pb.box(surf('plank', '#b07a48'), 9, 0.6, 7, 0, -0.3, -1.2, { r: 0.08 }); pb.done(p); p.position.copy(PODIUM).add(v3(0, 0.6, 0)); g.add(p); g.podium = p; p.visible = false; }
  // shops on both sides (fronts face the plaza)
  const shops = [['BAKERY', '#ffd84a', '#f7b9c9'], ['PIZZA PALACE', '#e2263a', '#fff1d6'], ['HATS & CO', '#3fb7a8', '#bfe0f7'], ['TOYS', '#b07cff', '#fde7a8'], ['BOOKS', '#3d78c9', '#cdeec4'], ['ICE CREAM', '#ff7ab6', '#ffd3b0']];
  g.shopFronts = [];
  [[-44, -26], [-44, 0], [-44, 26], [44, -26], [44, 0], [44, 26]].forEach(([x, z], i) => {
    const s = shops[[0, 4, 2, 1, 5, 3][i]], bd = building({ seed: 20 + i, floors: 2 + (i % 2), wall: s[2], style: 'stucco', trim: '#fffaf0', w: 24, d: 16, floorH: 7, lit: 0.1 });
    bd.position.set(x + Math.sign(x) * 2, 0, z); bd.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(bd);
    const name = s[0], col = s[1];
    const si = sign(name, { w: 14, h: 2.6, bg: col, fg: name === 'BAKERY' ? '#8a4a1e' : '#ffffff', edge: '#ffffff', frame: '#ffffff' }); si.position.set(x - Math.sign(x) * 6.6, 8.8, z); si.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(si);
    // awning
    b.box(paint(col, { roughness: 0.6 }), 1.6, 0.3, 16, x - Math.sign(x) * 7.4, 6.6, z, { r: 0.08, rz: Math.sign(x) * 0.35 });
    g.shopFronts.push(v3(x - Math.sign(x) * 7.5, 0, z));
    if (name === 'PIZZA PALACE') g.pizzaAt = v3(x - Math.sign(x) * 7.5, 0, z);
  });
  // lamps, benches, trees
  g.lamps = [];
  for (const [x, z] of [[-24, -36], [24, -36], [-24, 8], [24, 8], [-24, 36], [24, 36]]) { const l = lamp({ height: 11, color: '#2f5a4a' }); l.position.set(x, 0, z); l.rotation.y = x < 0 ? 0 : Math.PI; g.add(l); g.lamps.push(l); }
  { const w = surf('plank', '#c9824a'); for (const [x, z, ry] of [[-28, -10, Math.PI / 2], [28, 18, -Math.PI / 2], [-28, 20, Math.PI / 2]]) { const bb = new Batch(); bb.box(w, 6, 0.3, 1.6, 0, 1.5, 0, { r: 0.06 }); bb.box(w, 6, 1.2, 0.3, 0, 2.4, -0.7, { r: 0.06 }); for (const xx of [-2.6, 2.6]) bb.box(paint('#2f5a4a'), 0.3, 1.5, 1.4, xx, 0.75, 0, { r: 0.05 }); const m = bb.done(); m.position.set(x, 0, z); m.rotation.y = ry; g.add(m); } }
  const bark = paint('#86603e', { roughness: 0.9 }), leaves = ['#5fbf57', '#7ad06a', '#f6a9c4', '#4fae55'].map((c) => paint(c, { roughness: 0.85 }));
  for (const [x, z] of [[-30, -44], [30, -44], [-34, 44], [34, 44], [-60, -60], [60, -60], [-62, 60], [62, 62], [-16, 62], [18, 64], [-90, 0], [90, 10]]) { const h = 7 + r() * 4; b.cyl(bark, 0.55, 0.85, h, x, h / 2, z, { seg: 10 }); const m = leaves[Math.floor(r() * 4)]; for (const [dx, dy, rr] of [[0, h + 1.4, 4.2], [2.2, h - 0.5, 3.0], [-2.2, h - 0.2, 3.1]]) b.add(m, new THREE.IcosahedronGeometry(rr, 2), x + dx, dy, z); }
  // bunting from the tower to the lamps
  { const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7, color: '#ffffff' }), cols = ['#ff5c7a', '#ffd23f', '#3fb7ff', '#7cdf5a']; for (const [ax, az, bx2, bz] of [[-6, -45, -24, -36], [6, -45, 24, -36], [-24, 8, 24, 8]]) { const n = 14; for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = ax + (bx2 - ax) * u, z = az + (bz - az) * u, y = 10.5 - Math.sin(u * Math.PI) * 1.4; const tri = new THREE.ConeGeometry(0.5, 1.0, 3); tri.rotateZ(Math.PI); b.add(paint(cols[i % 4], { roughness: 0.7, side: THREE.DoubleSide }), tri, x, y - 0.5, z); } b.cyl(paint('#f2ead9'), 0.04, 0.04, Math.hypot(bx2 - ax, bz - az), (ax + bx2) / 2, 10.3, (az + bz) / 2, { seg: 4, rz: Math.PI / 2, ry: -Math.atan2(bz - az, bx2 - ax) }); } void m; }
  b.done(g);
  // the billboard (from L9)
  { const bb = new THREE.Group(), bs = sign('DON\'T PICTURE\nMISTER STILTS!', { w: 16, h: 7, bg: '#ffd84a', fg: '#e2263a', edge: '#e2263a', frame: '#3a3d44' }); bs.position.y = 9.5; bb.add(bs); const pb = new Batch(); for (const x of [-5, 5]) pb.box(paint('#3a3d44', { metalness: 0.4 }), 0.6, 6.5, 0.6, x, 3.25, -0.4, { r: 0.08 }); pb.done(bb); bb.position.copy(BILL); bb.rotation.y = -Math.PI / 2 - 0.5; g.add(bb); g.billboard = bb; bb.visible = false; }
  // posters on the shop walls (from L9)
  g.posters = [];
  for (const [x, z] of [[-37.6, -12], [37.6, 12], [-37.6, 14]]) { const p = sign('DON\'T PICTURE\nHIM!', { w: 4, h: 3, bg: '#e2263a', fg: '#ffffff', edge: '#ffffff', frame: '#ffffff' }); p.position.set(x, 4.2, z); p.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; p.scale.z = 0.3; g.add(p); g.posters.push(p); p.visible = false; }
  // Tess's house at the south edge, its door facing the tower
  const hs = tessHouse(); hs.position.copy(HOUSE); hs.rotation.y = 0; g.add(hs); g.house = hs;
  // the giant donut
  const dn = bigDonut(4.2); dn.position.copy(DONUT); g.add(dn); g.donut = dn;
  // party things (L17)
  { const p = new THREE.Group(); g.add(p); g.party = p; p.visible = false;
    const tb = new Batch(); tb.box(paint('#fdf6e3', { roughness: 0.75 }), 9, 0.3, 4.4, 0, 3.4, 0, { r: 0.1 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) tb.cyl(paint('#c98a56'), 0.18, 0.18, 3.3, sx * 4, 1.65, sz * 1.8, { seg: 8 }); tb.cyl(paint('#ffd9e5', { roughness: 0.5 }), 1.5, 1.6, 1.6, 0, 4.35, 0, { seg: 28 }); tb.cyl(paint('#ff7ab6', { roughness: 0.4 }), 1.55, 1.55, 0.3, 0, 5.1, 0, { seg: 28 }); tb.cyl(paint('#fff2c4', { roughness: 0.5 }), 1.0, 1.1, 1.0, 0, 5.75, 0, { seg: 24 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; tb.cyl(paint(['#3fb7ff', '#ffd23f'][i % 2]), 0.06, 0.06, 0.6, Math.cos(a) * 0.7, 6.55, Math.sin(a) * 0.7, { seg: 6 }); } tb.done(p);
    const fl = new THREE.InstancedMesh(new THREE.ConeGeometry(0.08, 0.25, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc35a').multiplyScalar(1.6) }), 8), M = new THREE.Matrix4(); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; M.setPosition(Math.cos(a) * 0.7, 7.0, Math.sin(a) * 0.7); fl.setMatrixAt(i, M); } fl.userData.noAO = true; p.add(fl);
    for (const [x, z] of [[-6, -2], [6, -2], [-6, 3], [6, 3]]) { const bl = partyBalloons(Math.abs(x * 3 + z)); bl.position.set(x, 0, z); p.add(bl); }
    const bn = sign('HAPPY 8TH, RUFUS!', { w: 14, h: 2.4, bg: '#3fb7ff', fg: '#ffffff', edge: '#ffd23f', frame: '#ffd23f' }); bn.position.set(0, 9.5, -3.5); p.add(bn); for (const x of [-7.2, 7.2]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10, 8), paint('#ffffff')); pole.position.set(x, 5, -3.6); p.add(pole); }
    shadowAll(p); }
  return shadowAll(g);
}
