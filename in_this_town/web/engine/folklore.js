// Episode 37's folklore kit (original designs): a two-joint "puppet" posed by world points (hand-keyed joints, knees that bend the wrong way, a ceiling
// crawler), a head with real deep eye sockets, a curtain of hair and a torn shroud rebuilt each frame as pure functions of the pose, the old school's
// staircase hall and corridor, paper charms, a straw rope, a child's satchel, a flashlight, falling dust.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { v3, rng, clamp, lerp, smooth, noise1 } from './core.js';
import { Batch, paint, surf } from './kit.js';
import { canvasTex } from './props.js';
import { wallPaint, ceilingTile, fluorPanel } from './hospital.js';

const UP = v3(0, 1, 0);
const srgb = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---- two-bone IK: the middle joint of a limb from a to t, bent toward pole ----
export function ik(a, t, l1, l2, pole) {
  const d = t.clone().sub(a), L = clamp(d.length(), Math.abs(l1 - l2) + 0.02, l1 + l2 - 0.02); d.normalize();
  const c = (l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), h = l1 * Math.sqrt(Math.max(0, 1 - c * c));
  const p = pole.clone().sub(d.clone().multiplyScalar(pole.dot(d))); if (p.lengthSq() < 1e-6) p.set(0, 0, 1); p.normalize();
  return { mid: a.clone().add(d.clone().multiplyScalar(l1 * c)).add(p.multiplyScalar(h)), end: a.clone().add(d.clone().multiplyScalar(L)) };
}
function segMesh(parent, mat, w, d) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, 1, d, 2, Math.min(w, d) * 0.36), mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; parent.add(m); return m;
}
const seg = (m, a, b) => { m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.y = Math.max(0.02, a.distanceTo(b)); m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize()); };

// ---- the eyeless head: a skull block whose front plate has two real holes running back into the dark ----
function faceTexture(W, H, skin, o) {
  const r = rng(o.seed ?? 37);
  return srgb(canvasTex(512, 576, (x, w, h) => {
    x.fillStyle = skin; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '60,60,70' : '240,236,226'},${0.02 + r() * 0.05})`; x.fillRect(r() * w, r() * h, 2 + r() * 34, 2 + r() * 24); }
    const ex = 0.285 * w, ey = 0.415 * h;                                      // eye holes in texture space
    for (const s of [-1, 1]) {
      const cx = w / 2 + s * ex * 0.62, g = x.createRadialGradient(cx, ey, 40, cx, ey, 150);
      g.addColorStop(0, 'rgba(20,12,18,0.75)'); g.addColorStop(0.42, 'rgba(40,28,38,0.42)'); g.addColorStop(1, 'rgba(60,50,60,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(10,6,10,0.8)'; x.lineCap = 'round';                // black runs down from each hole
      for (let i = 0; i < 5; i++) { const px = cx + (r() - 0.5) * 80; let y = ey + 62, xx = px; x.lineWidth = 3 + r() * 7; x.beginPath(); x.moveTo(xx, y); const n = 3 + Math.floor(r() * 4); for (let k = 0; k < n; k++) { xx += (r() - 0.5) * 14; y += 26 + r() * 34; x.lineTo(xx, y); } x.stroke(); }
    }
    x.strokeStyle = 'rgba(30,24,34,0.55)'; x.lineWidth = 2.4;                  // cracks
    for (let i = 0; i < 16; i++) { let px = r() * w, py = r() * h; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (r() - 0.5) * 60; py += (r() - 0.5) * 60; x.lineTo(px, py); } x.stroke(); }
    x.strokeStyle = 'rgba(14,8,12,0.9)'; x.lineWidth = 7; x.beginPath(); x.moveTo(w * 0.34, h * 0.8); x.quadraticCurveTo(w * 0.5, h * 0.83, w * 0.66, h * 0.79); x.stroke();   // a flat, pressed mouth line
  }));
}
export function socketHead(o = {}) {
  const W = o.w ?? 1.7, H = o.h ?? 1.95, D = o.d ?? 1.7, plate = o.plate ?? 0.78, skin = o.skin ?? '#c9c5ba';
  const g = new THREE.Group();
  const shape = new THREE.Shape(), r = 0.3, x0 = -W / 2, y0 = -H / 2;
  shape.moveTo(x0 + r, y0); shape.lineTo(-x0 - r, y0); shape.absarc(-x0 - r, y0 + r, r, -Math.PI / 2, 0, false); shape.lineTo(-x0, -y0 - r); shape.absarc(-x0 - r, -y0 - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x0 + r, -y0); shape.absarc(x0 + r, -y0 - r, r, Math.PI / 2, Math.PI, false); shape.lineTo(x0, y0 + r); shape.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  const holes = [[-0.42, 0.18], [0.42, 0.18]], rx = 0.3, ry = 0.38;
  for (const [cx, cy] of holes) { const h = new THREE.Path(); h.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, true); shape.holes.push(h); }
  const ex = new THREE.ExtrudeGeometry(shape, { depth: plate, bevelEnabled: false, curveSegments: 22 });
  ex.translate(0, 0, D / 2 - plate);
  const p = ex.attributes.position, col = new Float32Array(p.count * 3), uv = ex.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), depth = (D / 2 - Z) / plate; let inHole = false;
    for (const [cx, cy] of holes) if (((X - cx) / (rx * 1.04)) ** 2 + ((Y - cy) / (ry * 1.04)) ** 2 < 1.02) inHole = true;
    const c = inHole ? Math.max(0, 1 - depth * 1.55) ** 2.0 : 1; col[i * 3] = c; col[i * 3 + 1] = c; col[i * 3 + 2] = c;
    uv.setXY(i, X / W + 0.5, Y / H + 0.5);
  }
  ex.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const tex = faceTexture(W, H, skin, o), mat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.72 });
  const front = new THREE.Mesh(ex, mat); front.castShadow = true; g.add(front);
  const skull = new THREE.Mesh(new RoundedBoxGeometry(W, H, D - plate + 0.04, 3, 0.3), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 })); skull.position.z = -plate / 2; skull.castShadow = true; g.add(skull);
  const black = new THREE.MeshBasicMaterial({ color: '#000000' });
  for (const [cx, cy] of holes) { const d = new THREE.Mesh(new THREE.CircleGeometry(1, 28), black); d.scale.set(rx * 1.05, ry * 1.05, 1); d.position.set(cx, cy, D / 2 - plate + 0.035); d.userData.noAO = true; g.add(d); }
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(1, 24), black); mouth.position.set(0, -0.62, D / 2 + 0.008); mouth.scale.set(0.3, 0.001, 1); mouth.userData.noAO = true; g.add(mouth); g.mouth = mouth;
  g.size = { W, H, D }; return g;
}

// ---- a curtain of long hair: ribbons from the scalp, always facing the camera, hanging by world gravity ----
export function hairCurtain(parent, o = {}) {
  const N = o.n ?? 118, S = 11, mat = new THREE.MeshStandardMaterial({ color: o.color ?? '#060507', roughness: 0.9, metalness: 0, envMapIntensity: 0.25, side: THREE.DoubleSide });
  const pos = new Float32Array(N * (S + 1) * 2 * 3), nor = new Float32Array(pos.length), idx = [];
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  for (let i = 0; i < N; i++) for (let k = 0; k < S; k++) { const a = i * (S + 1) * 2 + k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.frustumCulled = false; parent.add(mesh);
  const r = rng(o.seed ?? 5), st = [];
  for (let i = 0; i < N; i++) {
    const front = i < N * 0.42, t = ((i - N * 0.42) / (N * 0.58)) * 2 - 1, a = front ? (i / (N * 0.42) - 0.5) * 2.1 : Math.sign(t || 1) * (1.2 + Math.abs(t) * (Math.PI - 1.2)) + (i % 2 ? 0.05 : -0.05);
    st.push({ a, front, len: (o.len ?? 8.2) * (0.72 + r() * 0.34), w: 0.1 + r() * 0.13, sw: r() * 100, lay: r() });
  }
  const P = v3(), T = v3(), cam = v3(), SIDE = v3();
  mesh.update = ({ H, X, Y, Z, W: hw, Hh, D: hd, camera, t, floor = 0, part = 0, blow = null }) => {
    let vi = 0;
    st.forEach((s) => {
      const sx = Math.sin(s.a), cz = Math.cos(s.a), root = v3(sx * hw * 0.5 * 0.96, Hh * 0.5 + 0.03 - s.lay * 0.1, cz * hd * 0.5 * 0.96);
      const sgn = s.a >= 0 ? 1 : -1, dl = s.len / S;
      for (let k = 0; k <= S; k++) {
        const u = k / S, drop = s.len * u;
        // local (x, y, z) offsets: hang by world gravity, expressed through the head's basis
        let lx = root.x * (1 + 0.14 * Math.min(1, u * 3)) * (1 - 0.42 * u * u), ly = root.y, lz = root.z;
        if (s.front) { lx *= 1 - part * 0.0; const pu = Math.max(smooth(0, 0.28, u), part * part); lx += sgn * part * (0.74 + s.lay * 0.42 + 0.34 * Math.abs(s.a)) * pu; }
        P.copy(H).addScaledVector(X, lx).addScaledVector(Y, ly).addScaledVector(Z, lz); P.y -= drop;
        const sway = s.len * u * u * 0.05; P.x += noise1(t * 0.45 + s.sw + u * 1.6) * sway; P.z += noise1(t * 0.37 + s.sw * 2 + u) * sway;
        if (blow) P.addScaledVector(blow, u * u * (0.6 + s.lay));
        // keep it out of the head: push to the nearest outside face in the head's frame
        const q = P.clone().sub(H), ax = q.dot(X), ay = q.dot(Y), az = q.dot(Z), mx = hw / 2 + 0.05, my = Hh / 2 + 0.05, mz = hd / 2 + 0.05 + (s.front ? 0.09 * s.lay : 0);
        if (Math.abs(ax) < mx && Math.abs(ay) < my && Math.abs(az) < mz) {
          const dx = mx - Math.abs(ax), dz = mz - Math.abs(az);
          if (s.front && part < 0.5) P.addScaledVector(Z, (az < 0 ? mz * 2 : mz - az)); else if (dx < dz) P.addScaledVector(X, Math.sign(ax || 1) * dx); else P.addScaledVector(Z, Math.sign(az || 1) * dz);
        }
        if (P.y < floor + 0.03) P.y = floor + 0.03 + 0.012 * s.lay;
        if (k === 0) T.copy(Y).multiplyScalar(-1); else { T.copy(P).sub(mesh._prev); if (T.lengthSq() < 1e-6) T.set(0, -1, 0); T.normalize(); }
        mesh._prev = (mesh._prev || v3()).copy(P);
        cam.copy(camera).sub(P).normalize(); SIDE.crossVectors(T, cam); if (SIDE.lengthSq() < 1e-6) SIDE.set(1, 0, 0); SIDE.normalize();
        const w = s.w * (1 - 0.86 * u * u) * 0.5;
        for (const sg of [-1, 1]) { pos[vi] = P.x + SIDE.x * w * sg; pos[vi + 1] = P.y + SIDE.y * w * sg; pos[vi + 2] = P.z + SIDE.z * w * sg; nor[vi] = cam.x + Math.sin(s.sw) * 0.5; nor[vi + 1] = cam.y + 0.35 + Math.cos(s.sw * 1.7) * 0.3; nor[vi + 2] = cam.z; vi += 3; }
      }
      void dl;
    });
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
  };
  return mesh;
}

// ---- a torn shroud skirt round the hips ----
function shroud(parent, mat, o = {}) {
  const N = 38, S = 5, pos = new Float32Array((N + 1) * (S + 1) * 3), idx = [], r = rng(o.seed ?? 3), L = [];
  for (let i = 0; i <= N; i++) L.push((o.len ?? 2.3) * (0.62 + r() * 0.5));
  for (let i = 0; i < N; i++) for (let k = 0; k < S; k++) { const a = i * (S + 1) + k, b = a + S + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.frustumCulled = false; parent.add(m);
  m.update = (hips, RR, FF, t, floor, w, d) => {
    let v = 0;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
      for (let k = 0; k <= S; k++) {
        const u = k / S, out = 1 + 0.26 * u, x = cs * w * out, z = sn * d * out;
        const px = hips.x + RR.x * x + FF.x * z + noise1(t * 0.5 + i * 0.6) * 0.1 * u, pz = hips.z + RR.z * x + FF.z * z + noise1(t * 0.43 + i) * 0.1 * u;
        let py = hips.y + 0.5 - L[i] * u; const fl = floor + 0.04 + 0.01 * (i % 3); if (py < fl) py = fl;
        pos[v++] = px; pos[v++] = py; pos[v++] = pz;
      }
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  };
  return m;
}

// ---- the puppet ----
export function puppet(o = {}) {
  const g = new THREE.Group(), skin = paint(o.skin ?? '#c5c1b6', { roughness: 0.78 }), body = o.bodyMat ?? paint('#c9c2ae', { roughness: 0.9 }), sleeve = o.sleeveMat ?? body;
  const L = { au: o.au ?? 3.1, al: o.al ?? 3.7, lu: o.lu ?? 3.3, ll: o.ll ?? 3.5 };
  const W = o.width ?? 1, TH = o.thick ?? 1;
  const pelvis = segMesh(g, body, 1.6 * W, 1.05), belly = segMesh(g, body, 1.5 * W, 0.92), chest = segMesh(g, body, 1.9 * W, 1.0), neck = segMesh(g, skin, 0.42, 0.42);
  const limbs = ['aR', 'aL', 'lR', 'lL'].map((n) => { const arm = n[0] === 'a'; return { n, up: segMesh(g, arm ? sleeve : skin, (arm ? 0.66 : 0.68) * TH, (arm ? 0.66 : 0.68) * TH), lo: segMesh(g, skin, (arm ? 0.34 : 0.44) * Math.max(TH, 0.8), (arm ? 0.34 : 0.44) * Math.max(TH, 0.8)),
    knob: arm ? null : new THREE.Mesh(new THREE.SphereGeometry(0.42 * TH, 12, 10), skin), tip: arm ? segMesh(g, skin, 0.5, 0.2) : segMesh(g, skin, 0.5, 1.5), fingers: arm ? [0, 1, 2, 3].map(() => [segMesh(g, skin, 0.1, 0.1), segMesh(g, skin, 0.08, 0.08)]) : [] }; });
  limbs.forEach((l) => { if (l.knob) { l.knob.castShadow = true; l.knob.frustumCulled = false; g.add(l.knob); } });
  if (o.head !== false) { g.head = socketHead(o.headOpts); g.add(g.head); }
  g.mount = new THREE.Group(); g.add(g.mount);
  if (o.hair !== false) {
    g.hair = hairCurtain(g, o.hairOpts);
    if (g.head) { const hm = new THREE.MeshStandardMaterial({ color: '#060507', roughness: 0.92, envMapIntensity: 0.25 }), h = g.head.size;   // a dark scalp, so no skull shows between the roots
      const top = new THREE.Mesh(new RoundedBoxGeometry(h.W + 0.12, 0.38, h.D + 0.12, 2, 0.15), hm); top.position.y = h.H / 2 - 0.06; top.castShadow = true; g.head.add(top);
      const back = new THREE.Mesh(new RoundedBoxGeometry(h.W + 0.12, h.H * 0.94, 0.24, 2, 0.1), hm); back.position.set(0, -0.02, -h.D / 2 - 0.02); back.castShadow = true; g.head.add(back); for (const sx of [-1, 1]) { const sd = new THREE.Mesh(new RoundedBoxGeometry(0.22, h.H * 0.94, h.D + 0.04, 2, 0.09), hm); sd.position.set(sx * (h.W / 2 + 0.03), -0.02, -0.04); sd.castShadow = true; g.head.add(sd); } }
  }
  if (o.robe !== false) g.skirt = shroud(g, body, o.robeOpts);
  g.grip = [v3(), v3()];
  const fing = (arr, wr, dir, side, pal, len, curl, gi) => arr.forEach((f, i) => {
    const off = (i - 1.5) * 0.17, a = wr.clone().addScaledVector(side, off), d1 = dir.clone().addScaledVector(side, off * 0.7).normalize(), l1 = len * (i === 0 || i === 3 ? 0.82 : 1);
    const b = a.clone().addScaledVector(d1, l1); if (i === 1 || i === 2) g.grip[gi].addScaledVector(b, 0.5); const d2 = d1.clone().addScaledVector(pal, curl).normalize(), c = b.clone().addScaledVector(d2, l1 * 0.9); seg(f[0], a, b); seg(f[1], b, c);
  });
  // P: { hips, chest, head, F, U, R? (head basis), hands: [r, l], feet: [r, l], elbow: [pr, pl], knee: [pr, pl], bodyF, floor, part, mouth, t, camera, finger, curl, toe }
  g.set = (P) => {
    const spine = P.chest.clone().sub(P.hips).normalize(), bF = P.bodyF.clone().addScaledVector(spine, -P.bodyF.dot(spine)).normalize(), bR = bF.clone().cross(spine).normalize();
    const waist = P.hips.clone().addScaledVector(spine, 0.55), mid = P.hips.clone().lerp(P.chest, 0.55);
    seg(pelvis, P.hips.clone().addScaledVector(spine, -0.5), waist); seg(belly, waist.clone().addScaledVector(spine, -0.08), mid); seg(chest, mid, P.chest.clone().addScaledVector(spine, 0.5));
    for (const m of [pelvis, belly, chest]) { const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(bR.clone().negate(), spine, bF)); m.quaternion.copy(q); }
    const F = P.F.clone().normalize(), U = P.U.clone().addScaledVector(F, -P.U.dot(F)).normalize(), X = U.clone().cross(F).normalize();
    const neckTop = P.head.clone().addScaledVector(U, -(g.head ? g.head.size.H * 0.5 : 0.55)), neckB = P.chest.clone().addScaledVector(spine, 0.45); seg(neck, neckB, neckTop);
    if (g.head) { g.head.position.copy(P.head); g.head.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, U, F)); g.head.mouth.scale.set(0.2 + 0.2 * (P.mouth ?? 0), 0.003 + 0.34 * (P.mouth ?? 0), 1); }
    g.mount.position.copy(P.head); g.mount.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, U, F));
    const sh = (s) => P.chest.clone().addScaledVector(bR, s * 1.1 * W).addScaledVector(spine, 0.2), hp = (s) => P.hips.clone().addScaledVector(bR, s * 0.55 * W);
    limbs.forEach((l, i) => {
      const arm = i < 2, s = i % 2 ? -1 : 1, a = arm ? sh(s) : hp(s), tg = (arm ? P.hands : P.feet)[i % 2], pole = (arm ? P.elbow : P.knee)[i % 2], l1 = arm ? L.au : L.lu, l2 = arm ? L.al : L.ll;
      const k = ik(a, tg, l1, l2, pole); seg(l.up, a, k.mid); seg(l.lo, k.mid, k.end);
      if (l.knob) { l.knob.position.copy(k.mid); const toe = (P.toe || bF).clone().normalize(); const ft = k.end.clone().addScaledVector(toe, 1.0); ft.y = Math.max(ft.y, k.end.y); seg(l.tip, k.end.clone().addScaledVector(toe, -0.2), ft); l.tip.scale.z = 1; }
      else { const dir = k.end.clone().sub(k.mid).normalize(), pl = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize(), sd = dir.clone().cross(pl).normalize(); const wr = k.end.clone().addScaledVector(dir, 0.46); seg(l.tip, k.end, wr); g.grip[i % 2].set(0, 0, 0); fing(l.fingers, wr, dir, sd, pl.clone().negate(), o.finger ?? 0.86, P.curl ?? 0.4, i % 2); }
    });
    if (g.skirt) g.skirt.update(P.hips, bR, bF, P.t, P.floor ?? 0, 0.92 * W, 0.68);
    if (g.hair) { const h = g.head.size; g.hair.update({ H: P.head, X, Y: U, Z: F, W: h.W, Hh: h.H, D: h.D, camera: P.camera, t: P.t, floor: P.floor ?? 0, part: P.part ?? 0, blow: P.blow }); }
  };
  return g;
}

// ---- paper charms and a straw rope ----
export function ofudaMat(seed = 1, o = {}) {
  const r = rng(seed);
  const t = srgb(canvasTex(128, 340, (x, w, h) => {
    x.fillStyle = o.paper ?? '#d9cfae'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(90,70,40,${0.04 + r() * 0.1})`; x.fillRect(r() * w, r() * h, 2 + r() * 22, 2 + r() * 14); }
    x.strokeStyle = '#7d1f18'; x.lineWidth = 3; x.strokeRect(10, 10, w - 20, h - 20);
    x.fillStyle = '#7d1f18'; x.font = '900 72px "Yu Gothic", "Meiryo", serif'; x.textAlign = 'center'; x.fillText('封', w / 2, 96);
    x.strokeStyle = '#201410'; x.lineCap = 'round'; x.lineWidth = 5;                                                   // brush marks, not words
    for (let j = 0; j < 5; j++) { const y = 130 + j * 38; x.beginPath(); x.moveTo(w / 2 - 28 + r() * 8, y); x.bezierCurveTo(w / 2 + 34, y - 12 + r() * 10, w / 2 - 30, y + 22, w / 2 + 26 + r() * 6, y + 18); x.stroke(); }
    x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 18; i++) { x.beginPath(); x.arc(r() * w, h - r() * 26, 5 + r() * 12, 0, 7); x.fill(); }
  }));
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
}
export function ofuda(seed = 1, w = 0.9, h = 2.4) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), ofudaMat(seed)); m.receiveShadow = true; return m; }
export function strawRope(a, b, o = {}) {
  const g = new THREE.Group(), sag = o.sag ?? 1.1, pts = [];
  for (let i = 0; i <= 18; i++) { const u = i / 18, p = a.clone().lerp(b, u); p.y -= sag * 4 * u * (1 - u); pts.push(p); }
  const tx = canvasTex(64, 128, (x, w, h) => { x.fillStyle = '#a8905a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5e4a26'; x.lineWidth = 7; for (let i = -4; i < 12; i++) { x.beginPath(); x.moveTo(0, i * 18); x.lineTo(w, i * 18 + 40); x.stroke(); } }); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(16, 1); srgb(tx);
  const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, o.r ?? 0.17, 8), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.95 })); rope.castShadow = true; g.add(rope);
  const paper = paint('#dfd8c2', { roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 2; i < 17; i += 3) { const p = pts[i], b2 = new Batch(); for (let k = 0; k < 4; k++) b2.box(paper, 0.5, 0.42, 0.02, (k % 2) * 0.22 - 0.1, -0.34 - k * 0.42, 0, { r: 0.005 }); const s = b2.done(); s.position.copy(p); s.rotation.y = i * 0.7 * 0.2; g.add(s); }
  return g;
}

// ---- a child's satchel, hung from the origin (its top handle) ----
export function satchel(o = {}) {
  const g = new THREE.Group(), b = new Batch(), red = paint(o.color ?? '#a81f22', { roughness: 0.42 }), dark = paint('#6e1216', { roughness: 0.5 }), metal = paint('#c9c3b4', { metalness: 0.85, roughness: 0.3 });
  b.box(red, 2.3, 2.7, 1.2, 0, -1.75, 0, { r: 0.28 }); b.box(dark, 2.34, 0.08, 1.24, 0, -2.4, 0, { r: 0.03 });
  b.box(dark, 0.34, 0.5, 0.2, -0.45, -0.22, 0, { r: 0.08 }); b.box(dark, 0.34, 0.5, 0.2, 0.45, -0.22, 0, { r: 0.08 }); b.box(red, 1.2, 0.16, 0.26, 0, -0.04, 0, { r: 0.07 });
  for (const x of [-0.75, 0.75]) { b.box(dark, 0.3, 2.9, 0.1, x, -1.8, -0.66, { r: 0.04 }); }
  b.done(g);
  const flap = new THREE.Group(); flap.position.set(0, -0.42, 0.6); const fb = new Batch(); fb.box(red, 2.36, 1.75, 0.16, 0, -0.86, 0.02, { r: 0.08 }); fb.box(metal, 0.5, 0.4, 0.12, 0, -1.62, 0.12, { r: 0.05 }); fb.box(dark, 2.0, 0.04, 0.03, 0, -0.12, 0.1, { r: 0.01 }); fb.done(flap); g.add(flap); g.flap = flap;
  const dark2 = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 0.22), new THREE.MeshBasicMaterial({ color: '#000000' })); dark2.position.set(0, -0.55, 0.61); g.add(dark2);
  const tag = srgb(canvasTex(256, 140, (x, w, h) => { x.fillStyle = '#f2d84a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3a3020'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = '#23201a'; x.font = '900 86px "Comic Sans MS", ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText(o.name ?? 'THEO', w / 2, 102); }));
  const tm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.56, 0.04), [paint('#c9b23a'), paint('#c9b23a'), paint('#c9b23a'), paint('#c9b23a'), new THREE.MeshStandardMaterial({ map: tag, roughness: 0.6 }), paint('#c9b23a')]);
  tm.position.set(0.55, -0.95, 0.2); tm.rotation.z = 0.12; tm.castShadow = true; flap.add(tm); g.tag = tm;
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
  return g;
}
export function flashlightProp() {
  const b = new Batch(), bl = paint('#22242a', { roughness: 0.4, metalness: 0.5 }); b.cyl(bl, 0.17, 0.15, 1.1, 0, 0, 0.1, { rx: Math.PI / 2, seg: 14 }); b.cyl(bl, 0.3, 0.2, 0.38, 0, 0, 0.82, { rx: Math.PI / 2, seg: 16 });
  const g = b.done(); const lens = new THREE.Mesh(new THREE.CircleGeometry(0.26, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8c49a').multiplyScalar(0.8) })); lens.position.z = 1.02; lens.userData.noAO = true; g.add(lens); return g;
}

// ---- falling dust from under a tread (one event: move it, set its age) ----
export function dustFall(parent, n = 130, o = {}) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n), r = rng(o.seed ?? 11);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * (o.w ?? 8); pos[i * 3 + 1] = r() * 0.1; pos[i * 3 + 2] = (r() - 0.5) * 0.3; seed[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { age: { value: 0 }, color: { value: new THREE.Color(o.color ?? '#cdc4ae') } },
    vertexShader: `attribute float seed; uniform float age; varying float f; void main(){ float a = max(0.0, age - seed * 0.25); vec3 p = position; p.y -= a * a * (4.0 + seed * 4.0) + a * 1.0; p.x += sin(seed * 90.0 + a * 2.0) * a * 0.4; p.z += cos(seed * 40.0 + a * 2.0) * a * 0.4; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (0.5 + seed * 1.1) * 110.0 / max(1.0, -mv.z); f = smoothstep(0.0, 0.08, a) * (1.0 - smoothstep(0.7, 1.7, a)) * 0.7; }`,
    fragmentShader: 'uniform vec3 color; varying float f; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(color, f * (1.0 - d * 1.6)); }' });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.noAO = true; parent.add(p); p.set = (a) => { m.uniforms.age.value = a; p.visible = a > 0 && a < 1.9; }; p.visible = false; return p;
}

// ---- wall stains and scratches ----
export function staining(w, h, seed = 3, o = {}) {
  const r = rng(seed), t = srgb(canvasTex(512, Math.round(512 * h / w), (x, W, H) => {
    x.clearRect(0, 0, W, H);
    for (let i = 0; i < (o.drips ?? 16); i++) { const px = r() * W, py = r() * H * 0.35, l = (0.3 + r() * 0.7) * H * 0.7, ww = 6 + r() * 34, g = x.createLinearGradient(0, py, 0, py + l); g.addColorStop(0, 'rgba(40,30,20,0.42)'); g.addColorStop(1, 'rgba(40,30,20,0)'); x.fillStyle = g; x.fillRect(px, py, ww, l); }
    for (let i = 0; i < 26; i++) { const px = r() * W, py = r() * H, s = 30 + r() * 130, g = x.createRadialGradient(px, py, 2, px, py, s); g.addColorStop(0, 'rgba(46,36,26,0.26)'); g.addColorStop(1, 'rgba(46,36,26,0)'); x.fillStyle = g; x.fillRect(px - s, py - s, s * 2, s * 2); }
    for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(214,206,186,0.28)'; x.beginPath(); const px = r() * W, py = r() * H; x.moveTo(px, py); for (let k = 0; k < 7; k++) x.lineTo(px + (r() - 0.5) * 90, py + (r() - 0.5) * 70); x.fill(); }
  }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9, depthWrite: false })); m.receiveShadow = true; return m;
}
export function tallyMarks(w, h, seed = 9) {
  const r = rng(seed), t = srgb(canvasTex(1024, Math.round(1024 * h / w), (x, W, H) => {
    x.clearRect(0, 0, W, H); x.lineCap = 'round';
    for (let g = 0; g < 150; g++) { const ox = r() * W, oy = r() * H, sz = 26 + r() * 22; x.strokeStyle = `rgba(226,214,186,${0.32 + r() * 0.4})`; x.lineWidth = 2.4 + r() * 2;
      const n = 3 + Math.floor(r() * 3); for (let k = 0; k < Math.min(n, 4); k++) { const dx = k * sz * 0.34; x.beginPath(); x.moveTo(ox + dx + (r() - 0.5) * 5, oy); x.lineTo(ox + dx + (r() - 0.5) * 5, oy + sz); x.stroke(); }
      if (n > 4) { x.beginPath(); x.moveTo(ox - 4, oy + sz * 0.8); x.lineTo(ox + sz * 1.2, oy + sz * 0.15); x.stroke(); } }
  }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 1, depthWrite: false, side: THREE.DoubleSide })); return m;
}
export function handPrint() {
  const t = srgb(canvasTex(256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#e6e1d2'; x.beginPath(); x.ellipse(w / 2, h * 0.68, 48, 58, 0, 0, 7); x.fill(); const f = [[-46, 1.0, -0.42], [-18, 1.32, -0.13], [12, 1.36, 0.1], [40, 1.14, 0.34], [68, 0.66, 0.92]];
    x.lineCap = 'round'; x.strokeStyle = '#e6e1d2'; x.lineWidth = 21; for (const [dx, l, a] of f) { x.beginPath(); x.moveTo(w / 2 + dx * 0.72, h * 0.54); x.lineTo(w / 2 + dx + Math.sin(a) * 118 * l, h * 0.54 - Math.cos(a) * 118 * l); x.stroke(); } }));
  return new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshStandardMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, roughness: 1 }));
}

// ---- the staircase hall: x -14..9.6, z 0..46, ceiling 13; stairs along the right wall from z 16 up through a hole in the ceiling; the cavity under them opens to -x ----
export const STAIR = { N: 13, rise: 14 / 13, run: 1.85, z0: 16, x0: 0, x1: 9.4, H: 13, door: 4 };
export function stairHall() {
  const g = new THREE.Group(), b = new Batch(), { N, rise, run, z0, x0, x1, H } = STAIR;
  const old = surf('plank', '#7b5b3f', { roughness: 0.62 }), oldD = surf('plank', '#3f2d20', { roughness: 0.8 }), wall = wallPaint('#a29d84'), lower = surf('plank', '#5a4230', { roughness: 0.66 }), ceil = ceilingTile('#8e8a78'), trim = paint('#3a2a1e', { roughness: 0.7 });
  // floor and ceiling (with the stair hole)
  b.box(old, 24, 0.4, 46, -2.2, -0.2, 23, { r: 0.02 });
  b.box(ceil, 23.8, 0.3, 19.4, -2.2, H + 0.15, 9.7, { r: 0.02 }); b.box(ceil, 14.2, 0.3, 26.8, -7.1, H + 0.15, 32.6, { r: 0.02 });
  b.box(paint('#050406'), 12, 0.3, 30, 4.8, 27, 32, { r: 0.02 }); for (const [x, z, w, d] of [[-0.1, 32, 0.3, 30], [9.8, 32, 0.3, 30]]) b.box(paint('#050406'), w, 14, d, x, 20, z, { r: 0.01 }); b.box(paint('#050406'), 12, 14, 0.3, 4.8, 20, 19.2, { r: 0.01 }); b.box(paint('#050406'), 12, 14, 0.3, 4.8, 20, 47, { r: 0.01 });
  // walls: left has three tall boarded windows
  b.box(wall, 0.4, H, 46.8, 9.8, H / 2, 23, { r: 0.01 }); b.box(wall, 24.4, H, 0.4, -2.2, H / 2, 46.2, { r: 0.01 });
  const LW = (z, y, d, h) => b.box(wall, 0.4, h, d, -14.2, y, z, { r: 0.01 });
  LW(23, 1.75, 46.8, 3.5); LW(23, 12.25, 46.8, 1.5); for (const z of [-0.2, 12, 24, 36, 46.2]) LW(z, 7, z < 1 || z > 46 ? 1.8 : 4.6, 7);
  // front wall with the double door hole x -4..4, height 9
  for (const [x, w] of [[-9.2, 10.2], [7.05, 6.1]]) b.box(wall, w, H, 0.4, x, H / 2, -0.2, { r: 0.01 }); b.box(wall, 8.2, H - 9, 0.4, 0, (H + 9) / 2, -0.2, { r: 0.01 });
  // wainscot and skirting
  for (const [x, z, w, d] of [[-13.92, 23, 0.16, 46.4], [9.52, 8, 0.16, 16]]) { b.box(lower, w, 4.2, d, x, 2.1, z, { r: 0.02 }); b.box(trim, w + 0.12, 0.26, d, x, 4.3, z, { r: 0.04 }); }
  for (const [x, w] of [[-9.2, 10.2], [7.05, 6.1]]) { b.box(lower, w, 4.2, 0.16, x, 2.1, 0.08, { r: 0.02 }); b.box(trim, w, 0.26, 0.28, x, 4.3, 0.08, { r: 0.04 }); }
  for (const s of [-1, 1]) b.box(trim, 0.5, 9.4, 0.7, s * 4.25, 4.7, 0, { r: 0.05 }); b.box(trim, 9, 0.5, 0.7, 0, 9.3, 0, { r: 0.05 });
  // window frames, cross bars, boards over them
  const r = rng(21);
  for (const z of [6, 18, 30, 41]) { const cz = z; b.box(trim, 0.34, 0.34, 7.6, -14.0, 3.6, cz, { r: 0.04 }); b.box(trim, 0.34, 0.34, 7.6, -14.0, 10.5, cz, { r: 0.04 }); for (const k of [-3.7, 0, 3.7]) b.box(trim, 0.3, 7, 0.26, -14.05, 7, cz + k, { r: 0.04 }); b.box(trim, 0.3, 0.2, 7.4, -14.05, 7, cz, { r: 0.03 });
    for (let k = 0; k < 3; k++) b.box(old, 0.16, 0.8, 9, -13.82, 4.8 + k * 2.2 + r() * 0.5, cz + (r() - 0.5) * 0.6, { r: 0.03, rx: (r() - 0.5) * 0.26 }); }
  // the stairs: risers and treads; the first three treads are separate (they dip when counted)
  const treads = [];
  for (let i = 1; i <= N; i++) { const y = i * rise, z = z0 + (i - 1) * run;
    b.box(lower, x1 - x0, rise, 0.14, (x0 + x1) / 2, y - rise / 2, z, { r: 0.015 });
    if (i <= 3) { const tb = new Batch(); tb.box(old, x1 - x0 + 0.1, 0.22, run + 0.1, 0, 0, 0, { r: 0.03 }); tb.box(trim, x1 - x0 + 0.1, 0.09, 0.08, 0, 0.09, -run / 2 + 0.12, { r: 0.02 }); const m = tb.done(); m.position.set((x0 + x1) / 2, y + 0.02, z + run / 2); g.add(m); treads.push(m); }
    else { b.box(old, x1 - x0 + 0.1, 0.22, run + 0.1, (x0 + x1) / 2, y + 0.02, z + run / 2, { r: 0.03 }); } }
  // the sloped soffit under the stairs, the outer stringer, a stout newel post and a handrail
  const a = Math.atan2(14, N * run), LEN = Math.hypot(14, N * run);
  b.box(oldD, x1 - x0 + 0.4, 0.3, LEN, (x0 + x1) / 2, 7 - 0.72, z0 + N * run / 2 + 0.2, { r: 0.02, rx: -a });
  b.box(lower, 0.42, 1.4, LEN + 1, x0 - 0.05, 7 + 0.1, z0 + N * run / 2, { r: 0.05, rx: -a });
  b.box(trim, 1.0, 6.4, 1.0, x0 - 0.05, 3.2, z0 - 0.3, { r: 0.1 }); b.box(trim, 1.25, 0.4, 1.25, x0 - 0.05, 6.5, z0 - 0.3, { r: 0.12 }); b.box(trim, 0.34, 0.34, LEN, x0 - 0.05, 7 + 3.3 + 0.1, z0 + N * run / 2, { r: 0.1, rx: -a });
  for (let i = 1; i < N - 1; i++) { const z = z0 + i * run + 0.3, y = i * rise; b.box(trim, 0.2, 3.5, 0.2, x0 - 0.05, y + 1.75, z, { r: 0.05 }); }
  // the side panel below the stringer, with the low opening z 28.2..37.8 (a hole in a plank wall)
  const sh = new THREE.Shape(); sh.moveTo(z0 + 0.5, 0); sh.lineTo(40.2, 0); sh.lineTo(40.2, 14); sh.lineTo(z0 + 0.5, 0.2);
  const hole = new THREE.Path(); hole.moveTo(28.2, 0); hole.lineTo(28.2, 5.6); hole.lineTo(31, 7.9); hole.lineTo(37.8, 7.9); hole.lineTo(37.8, 0); sh.holes.push(hole);
  const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: false }); { const p = pg.attributes.position, uv = pg.attributes.uv; for (let i = 0; i < p.count; i++) { uv.setXY(i, p.getX(i) / 7, p.getY(i) / 7); } }
  const pm = new THREE.Mesh(pg, surf('plank', '#49362a', { roughness: 0.75 })); pm.rotation.y = -Math.PI / 2; pm.position.set(0.17, 0, 0); pm.castShadow = true; pm.receiveShadow = true; g.add(pm);
  for (const [z, h, rz] of [[28.15, 5.8, 0.03], [37.85, 8.1, -0.02]]) b.box(trim, 0.5, h, 0.42, -0.02, h / 2, z, { r: 0.04, rx: rz });
  // loose boards at the opening's edges
  b.box(oldD, 0.1, 5.2, 0.7, -0.25, 2.5, 29.1, { r: 0.02, rx: 0.2, rz: 0.1 }); b.box(oldD, 0.1, 3.2, 0.7, -0.25, 6.2, 36.9, { r: 0.02, rx: -0.3, rz: -0.05 });
  // in the cavity: dirt floor and back wall; children's shoes in a neat line; small shoes (the ones she kept)
  b.box(paint('#2a231c', { roughness: 1 }), 9.2, 0.1, 21, 4.7, 0.05, 29, { r: 0.02 });
  const sc = ['#d9d4c6', '#a43a3a', '#3a5a8a', '#6a8a4a', '#d8b24a', '#7a4a8a', '#c9c4b4'];
  for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { const z = 36.4 - i * 0.92, x = 8.3 + s * 0.3; b.box(paint(sc[i], { roughness: 0.85 }), 0.5, 0.42, 1.0, x, 0.32, z, { r: 0.15, ry: Math.PI / 2 }); b.box(paint('#d6d0c0', { roughness: 0.8 }), 0.54, 0.1, 1.04, x, 0.1, z, { r: 0.03, ry: Math.PI / 2 }); }
  // the shoe cubbies, a long bench, overturned chairs, papers on the floor, a noticeboard
  const cb = paint('#6b553f', { roughness: 0.7 }); b.box(cb, 9.8, 6.4, 1.8, -8.6, 3.2, 44.8, { r: 0.05 }); for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) b.box(paint('#151210'), 1.14, 1.3, 0.16, -13 + i * 1.34 + 0.4, 1.0 + j * 1.5, 43.9, { r: 0.02 });
  b.box(surf('plank', '#6a5040'), 13, 0.32, 1.8, -12.1, 2.1, 22, { r: 0.05, ry: Math.PI / 2 }); for (const z of [17, 27]) b.box(trim, 1.6, 2, 0.3, -12.1, 1.0, z, { r: 0.03 });
  const chair = (x, z, ry) => { const c = new Batch(), w = surf('plank', '#7a5a3e'), m = paint('#3a3c40', { metalness: 0.5 }); c.box(w, 2.4, 0.22, 2.2, 0, 2.3, 0, { r: 0.05 }); c.box(w, 2.4, 1.4, 0.2, 0, 3.8, -1, { r: 0.05, rx: -0.08 }); for (const dx of [-1, 1]) for (const dz of [-0.9, 0.9]) c.box(m, 0.14, 2.3, 0.14, dx, 1.15, dz, { r: 0.03 }); const o = c.done(); o.rotation.set(Math.PI / 2 - 0.12, ry, 0); o.position.set(x, 1.3, z); g.add(o); };
  chair(-8.5, 9.5, 0.7); chair(-10.5, 34, 2.6);
  for (let i = 0; i < 26; i++) b.box(paint('#d8d0bc', { roughness: 1 }), 0.8 + r() * 0.5, 0.012, 1.1 + r() * 0.5, -12 + r() * 11, 0.02 + r() * 0.01, 2 + r() * 40, { r: 0.002, ry: r() * 3 });
  // a bare bulb on a cord over the stair foot
  b.cyl(paint('#111'), 0.02, 0.02, 2.2, 4.7, H - 1.1, 13.5, { seg: 5 }); b.done(g);
  const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc98a').multiplyScalar(1.5) }); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), bm); bulb.position.set(4.7, H - 2.3, 13.5); bulb.userData.noAO = true; g.add(bulb); g.bulb = bm; g.bulbP = bulb.position.clone();
  // stains
  const st = (mesh, x, y, z, ry) => { mesh.position.set(x, y, z); mesh.rotation.y = ry; g.add(mesh); };
  st(staining(46, 9, 3), -13.8, 8.7, 23, Math.PI / 2); st(staining(23, 8.6, 5), -2.2, 8.7, 45.9, Math.PI); st(staining(16, 8.6, 8), 9.5, 8.7, 8, -Math.PI / 2); st(staining(9.7, 3.8, 12), -9.2, 10.9, 0.1, 0);
  const cs = staining(23, 19, 15, { drips: 4 }); cs.rotation.x = Math.PI / 2; cs.position.set(-2.2, H - 0.02, 9.7); g.add(cs);
  // the numbers painted on the risers
  g.numbers = [];
  for (let i = 1; i <= N; i++) { const z = z0 + (i - 1) * run, y = (i - 0.5) * rise, t = srgb(canvasTex(160, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = 'rgba(214,206,186,0.82)'; x.font = '900 104px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText(String(i), w / 2, 104); x.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 40; k++) { x.beginPath(); x.arc(r() * w, r() * h, 1 + r() * 7, 0, 7); x.fill(); } }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.92), new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 1 })); m.position.set(4.7, y, z - 0.09); m.rotation.y = Math.PI; g.add(m); g.numbers.push(m); }
  g.treads = treads;
  // charms round the opening, tally marks inside
  const ch = [[-0.2, 5.0, 27.7], [-0.2, 2.7, 27.75], [-0.2, 7.4, 30.2], [-0.2, 8.6, 33], [-0.2, 8.5, 35.8], [-0.2, 7.9, 38.2], [-0.2, 4.5, 38.3], [-0.2, 2.0, 38.25]];
  ch.forEach(([x, y, z], i) => { const o = ofuda(40 + i); o.position.set(x, y, z); o.rotation.y = -Math.PI / 2; o.rotation.z = (i % 2 ? 1 : -1) * 0.06; g.add(o); });
  for (const [z, ry] of [[40.5, Math.PI], [23.0, 0]]) { const m = tallyMarks(9.3, 7.2, 9 + z); m.position.set(4.75, 3.7, z); m.rotation.y = ry; g.add(m); }
  { const m = tallyMarks(13, 7.5, 33); m.position.set(9.45, 3.8, 32); m.rotation.y = -Math.PI / 2; g.add(m); }
  // the rope across the stair foot and a warning board
  const posts = new Batch(); for (const x of [0.8, 8.8]) { posts.box(trim, 0.34, 4.0, 0.34, x, 2.0, 15.2, { r: 0.06 }); } posts.done(g);
  const rope = strawRope(v3(0.8, 3.9, 15.2), v3(8.8, 3.9, 15.2)); g.add(rope);
  const bd = srgb(canvasTex(512, 200, (x, w, h) => { x.fillStyle = '#b8a282'; x.fillRect(0, 0, w, h); x.fillStyle = '#6a3a24'; for (let i = 0; i < 6; i++) x.fillRect(0, i * 36 + 16, w, 2); x.fillStyle = '#301a12'; x.font = '900 86px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('DO NOT', w / 2, 88); x.fillText('USE', w / 2, 176); }));
  const bdm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.34, 0.12), [paint('#6a5a44'), paint('#6a5a44'), paint('#6a5a44'), paint('#6a5a44'), paint('#6a5a44'), new THREE.MeshStandardMaterial({ map: bd, roughness: 0.8 })]); bdm.position.set(4.7, 3.3, 15.05); bdm.rotation.set(0.02, 0, 0.04); bdm.castShadow = true; g.add(bdm); g.barrier = [rope, bdm];
  // the hall's doors (leaves hinged at the frame's edges, propped open)
  g.door = doubleDoor(g, 0, 0, 0); g.door.set(1.35);
  return g;
}
export function doubleDoor(parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const mk = () => { const h = new THREE.Group(), b = new Batch(), w = surf('plank', '#65492f', { roughness: 0.6 }), fr = paint('#31241a', { roughness: 0.7 }); b.box(w, 3.9, 8.9, 0.3, 1.95, 4.45, 0, { r: 0.03 }); b.box(paint('#2a2c30', { metalness: 0.7, roughness: 0.3 }), 2.8, 0.28, 0.3, 2.1, 4.3, 0.2, { r: 0.1 }); b.box(fr, 2.6, 3.0, 0.08, 1.95, 7.2, 0.16, { r: 0.02 }); b.box(paint('#4b5a62', { roughness: 0.1, metalness: 0.5 }), 2.2, 2.6, 0.04, 1.95, 7.2, 0.2, { r: 0.01 }); b.done(h); return h; };
  const L = mk(); L.position.set(-3.95, 0, 0); L.scale.x = 1; g.add(L);
  const R = mk(); R.scale.x = -1; R.position.set(3.95, 0, 0); g.add(R);
  g.set = (a) => { L.rotation.y = a; R.rotation.y = -a; };
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

// ---- the corridor: x -7..7, z -72..0, ceiling 12 ----
export function schoolCorridor() {
  const g = new THREE.Group(), b = new Batch(), H = 12, Z0 = -72, Z1 = 0, Zc = (Z0 + Z1) / 2, LN = Z1 - Z0, r = rng(9);
  const wood = surf('plank', '#755639', { roughness: 0.6 }), wall = wallPaint('#b0ad94'), lower = surf('plank', '#574132', { roughness: 0.65 }), trim = paint('#37281d', { roughness: 0.7 }), frost = paint('#7f908d', { roughness: 0.3 });
  b.box(wood, 15, 0.4, LN + 1, 0, -0.2, Zc, { r: 0.02 }); b.box(ceilingTile('#918c7a'), 15, 0.3, LN + 1, 0, H + 0.15, Zc, { r: 0.02 });
  // gaps between floorboards
  for (let x = -6.6; x < 7; x += 1.65) b.box(paint('#2a1e14', { roughness: 1 }), 0.05, 0.02, LN, x, 0.01, Zc, { r: 0.004 });
  // end wall with the exit door hole; right wall (x 7) with windows every 12; left wall (x -7) with sliding classroom doors every 14
  for (const [x, w] of [[-5.75, 3.5], [5.75, 3.5]]) b.box(wall, w, H, 0.4, x, H / 2, Z0 - 0.2, { r: 0.01 }); b.box(wall, 8.2, H - 9, 0.4, 0, (H + 9) / 2, Z0 - 0.2, { r: 0.01 });
  for (const s of [-1, 1]) b.box(trim, 0.5, 9.4, 0.7, s * 4.25, 4.7, Z0, { r: 0.05 }); b.box(trim, 9, 0.5, 0.7, 0, 9.3, Z0, { r: 0.05 });
  const RW = (z, y, d, h) => b.box(wall, 0.4, h, d, 7.2, y, z, { r: 0.01 });
  RW(Zc, 1.75, LN, 3.5); RW(Zc, 11.25, LN, 1.5);
  const LWd = (z, y, d, h) => b.box(wall, 0.4, h, d, -7.2, y, z, { r: 0.01 });
  LWd(Zc, 10.6, LN, 2.8);
  for (let z = Z0; z < Z1 - 0.1; z += 14) { // one bay of 14: a door 6 wide at the bay's middle
    const zc = z + 7; LWd(z + 2, 4.6, 4, 9.2); LWd(z + 12, 4.6, 4, 9.2);
    b.box(paint('#121014'), 0.2, 9.2, 6, -7.5, 4.6, zc, { r: 0.01 });
    b.box(trim, 0.44, 9.5, 0.36, -6.98, 4.75, zc - 3, { r: 0.04 }); b.box(trim, 0.44, 9.5, 0.36, -6.98, 4.75, zc + 3, { r: 0.04 }); b.box(trim, 0.44, 0.4, 6.4, -6.98, 9.35, zc, { r: 0.04 });
    const open = ((zc + 200) | 0) % 3 === 0, dz = open ? -2.0 : 0;
    b.box(lower, 0.18, 8.8, 3.0, -6.95, 4.45, zc - 1.45 + dz, { r: 0.02 }); b.box(lower, 0.18, 8.8, 3.0, -6.8, 4.45, zc + 1.45, { r: 0.02 });
    for (const q of [zc - 1.45 + dz, zc + 1.45]) { b.box(trim, 0.22, 3.6, 2.5, -6.86, 6.7, q, { r: 0.02 }); b.box(frost, 0.1, 3.2, 2.2, -6.8, 6.7, q, { r: 0.01 }); }
    // the wainscot on the wall either side
    for (const zz of [z + 2, z + 12]) { b.box(lower, 0.14, 4.2, 3.9, -6.9, 2.1, zz, { r: 0.02 }); b.box(trim, 0.26, 0.26, 3.9, -6.88, 4.3, zz, { r: 0.04 }); }
    // a classroom plate
    b.box(paint('#d6d0be'), 0.1, 0.8, 1.9, -6.88, 10.1, zc, { r: 0.02 });
  }
  for (let z = Z0; z < Z1 - 0.1; z += 12) { const zc = z + 6; RW(zc - 5, 7, 2, 7); RW(zc + 5, 7, 2, 7); b.box(trim, 0.34, 0.34, 8.2, 7.0, 3.6, zc, { r: 0.04 }); b.box(trim, 0.34, 0.34, 8.2, 7.0, 10.5, zc, { r: 0.04 }); for (const k of [-3.9, 0, 3.9]) b.box(trim, 0.3, 7, 0.26, 7.05, 7, zc + k, { r: 0.04 }); b.box(trim, 0.3, 0.22, 8, 7.05, 7, zc, { r: 0.03 });
    for (let k = 0; k < 2; k++) b.box(wood, 0.16, 0.8, 8.8, 6.78, 5 + k * 3 + r() * 0.8, zc + (r() - 0.5), { r: 0.03, rx: (r() - 0.5) * 0.2 });
    b.box(lower, 0.14, 3.5, 10, 6.9, 1.75, zc, { r: 0.02 }); }
  // low boards and papers on the floor, a fallen locker
  for (let i = 0; i < 34; i++) b.box(paint('#d6cfba', { roughness: 1 }), 0.8 + r() * 0.5, 0.012, 1.1 + r() * 0.5, -5.8 + r() * 11.6, 0.02 + r() * 0.01, Z0 + 3 + r() * (LN - 6), { r: 0.002, ry: r() * 3 });
  b.box(paint('#4c5a60', { metalness: 0.4, roughness: 0.55 }), 2.4, 6.5, 2.0, 5.3, 1.05, -39, { r: 0.08, rz: Math.PI / 2 - 0.05, ry: 0.1 });
  b.done(g);
  // a moonlit night behind the corridor's windows
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(LN, 16), new THREE.MeshBasicMaterial({ map: srgb(canvasTex(1024, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0e1730'); gr.addColorStop(0.7, '#25345a'); gr.addColorStop(0.72, '#0a1014'); gr.addColorStop(1, '#06090c'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#0a1014'; const q = rng(4); for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(q() * w, h * 0.72, 16 + q() * 34, 0, 7); x.fill(); } })), color: new THREE.Color('#ffffff').multiplyScalar(0.7), fog: false }));
  sky.position.set(13, 6, Zc); sky.rotation.y = -Math.PI / 2; sky.userData.noAO = true; g.add(sky);
  // stains; tube fittings
  for (const [w, h, x, y, z, ry, s] of [[LN, 6.2, 6.96, 8.4, Zc, -Math.PI / 2, 22], [LN, 7, -6.82, 8.6, Zc, Math.PI / 2, 24]]) { const m = staining(w, h, s, { drips: 34 }); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); }
  const cs = staining(14.6, LN, 27, { drips: 3 }); cs.rotation.x = Math.PI / 2; cs.position.set(0, H - 0.02, Zc); g.add(cs);
  g.tubes = []; for (let z = -8; z > Z0; z -= 13) { const f = fluorPanel(2.2, 5.6, { tint: '#d8ecd8', gain: 1.0 }); f.position.set(0, H - 0.12, z); g.add(f); g.tubes.push({ f, z }); }
  // the exit door and its dim green sign
  g.door = doubleDoor(g, 0, Z0, 0); g.door.set(0);
  const ex = srgb(canvasTex(256, 96, (x, w, h) => { x.fillStyle = '#163d26'; x.fillRect(0, 0, w, h); x.fillStyle = '#b8f2c6'; x.font = '900 74px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('EXIT', w / 2, 74); }));
  const em = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.1), new THREE.MeshBasicMaterial({ map: ex, color: new THREE.Color('#ffffff').multiplyScalar(0.85) })); em.position.set(0, 10.6, Z0 + 0.32); em.userData.noAO = true; g.add(em);
  g.traverse((m) => { if (m.isMesh && m !== em && m.material && !m.material.transparent) m.receiveShadow = true; });
  return g;
}
