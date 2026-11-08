// Swords and armour (Episode 32; reusable): original designs.
//   blackSword()            a long single-edged blade of pure black steel (a faint violet sheen on the edge), wrapped grip
//   whiteBlade()            a broad greatsword whose blade glows white (crisp emissive core, no bloom needed)
//   armorSuit(ch, o)        dark plate armour fitted to any character's parts; .shatter(dt) bursts it into shards
//   swordField(scene, o)    thousands of black swords standing in rock, a wave of light waking them (.wake(t))
// Every sword is built along +z from its grip at the origin (anims.js holdProp holds it like that): .tip, .hilt2 (where a
// second hand goes), .len.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, rng, v3 } from './core.js';
import { canvasTex } from './props.js';

const rb = (w, h, d, r = 0.04, s = 2) => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2, h / 2, d / 2) * 0.999);

// a blade's cross-section: a flat diamond (or one edge for a katana-like back), extruded along +z with a taper and a tip
function bladeGeo(len, w0, w1, th, o = {}) {
  const N = 24, pos = [], idx = [];
  const sec = (s) => { const w = lerp(w0, w1, Math.pow(s, 1.4)) * (s > 0.86 ? Math.max(0.02, 1 - (s - 0.86) / 0.14) ** (o.single ? 0.8 : 0.65) : 1), t = th * (1 - s * 0.5);
    return o.single ? [[0, w * 0.5, t * 0.5], [0, w * 0.5, -t * 0.5], [0, -w * 0.5, 0]] : [[0, w * 0.5, 0], [0, 0, t * 0.5], [0, -w * 0.5, 0], [0, 0, -t * 0.5]]; };
  const M = o.single ? 3 : 4;
  for (let i = 0; i <= N; i++) { const s = i / N, z = s * len, cur = o.curve ? Math.sin(s * Math.PI * 0.5) * o.curve : 0; for (const [, y, x] of sec(s)) pos.push(x, y + cur, z); }
  for (let i = 0; i < N; i++) for (let k = 0; k < M; k++) { const a = i * M + k, b = i * M + (k + 1) % M, c = a + M, d = b + M; idx.push(a, c, b, b, c, d); }
  const tip = pos.length / 3; pos.push(0, o.curve ? o.curve : 0, len * 1.035); for (let k = 0; k < M; k++) idx.push(N * M + k, tip, N * M + (k + 1) % M);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}

function wrapTex(a, b) {
  const t = canvasTex(64, 256, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); x.strokeStyle = b; x.lineWidth = 9; for (let y = -64; y < h + 64; y += 22) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + 26); x.stroke(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function blackSword(o = {}) {
  const g = new THREE.Group(), len = o.len ?? 4.4, s = o.scale ?? 1;
  // the blade: near-black, glossy, a thin violet-grey sheen on the edge (readable against a dark sky)
  const steel = new THREE.MeshStandardMaterial({ color: '#07070a', metalness: 0.9, roughness: 0.18, envMapIntensity: 1.4 });
  const edge = new THREE.MeshStandardMaterial({ color: '#3a3448', metalness: 1, roughness: 0.12, emissive: '#6a4cff', emissiveIntensity: 0 });
  const blade = new THREE.Mesh(bladeGeo(len, 0.34, 0.22, 0.09, { curve: 0.12 }), steel); blade.position.z = 0.42; g.add(blade);
  const ed = new THREE.Mesh(bladeGeo(len * 0.995, 0.36, 0.235, 0.012, { curve: 0.12 }), edge); ed.position.z = 0.42; g.add(ed);
  // fuller line: a darker groove
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, len * 0.62), new THREE.MeshStandardMaterial({ color: '#000000', metalness: 0.6, roughness: 0.4 })); fl.position.set(0, 0.04, 0.42 + len * 0.36); g.add(fl);
  // guard: a black disc with a notched rim, a collar
  const iron = new THREE.MeshStandardMaterial({ color: '#16161a', metalness: 0.85, roughness: 0.35 });
  const gu = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 8), iron); gu.rotation.x = Math.PI / 2; gu.position.z = 0.36; g.add(gu);
  const co = new THREE.Mesh(rb(0.2, 0.44, 0.22, 0.04), iron); co.position.z = 0.5; g.add(co);
  // grip: wrapped black cord over dark red, a pommel ring
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.125, 1.25, 12), new THREE.MeshStandardMaterial({ map: wrapTex('#1a0c10', '#3a1820'), roughness: 0.85 })); grip.rotation.x = Math.PI / 2; grip.position.z = -0.32; g.add(grip);
  const pm = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 8, 16), iron); pm.position.z = -1.0; g.add(pm);
  g.scale.setScalar(s);
  g.userData = { len: len + 0.42, tip: v3(0, 0.12, (len * 1.03 + 0.42)), hilt2: v3(0, 0, -0.72), edge, steel };
  g.tip = g.userData.tip; g.hilt2 = g.userData.hilt2; g.edge = edge; g.blade = blade;
  g.setGlow = (k) => { edge.emissiveIntensity = k; };
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

export function whiteBlade(o = {}) {
  const g = new THREE.Group(), len = o.len ?? 5.0;
  const core = new THREE.MeshStandardMaterial({ color: '#dfe8ff', emissive: '#e6eeff', emissiveIntensity: 1.1, metalness: 0.2, roughness: 0.3 });
  const rim = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fd4ff').multiplyScalar(1.15), transparent: true, opacity: 0.55, depthWrite: false, toneMapped: true });
  const blade = new THREE.Mesh(bladeGeo(len, 0.62, 0.48, 0.12), core); blade.position.z = 0.5; g.add(blade);
  const halo = new THREE.Mesh(bladeGeo(len * 1.01, 0.82, 0.66, 0.16), rim); halo.position.z = 0.47; halo.userData.noAO = true; g.add(halo);
  const steel = new THREE.MeshStandardMaterial({ color: '#4a4f5a', metalness: 0.9, roughness: 0.3 });
  const trim = new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.95, roughness: 0.25 });
  const gu = new THREE.Mesh(rb(1.5, 0.22, 0.24, 0.08), steel); gu.position.z = 0.42; g.add(gu);
  for (const sx of [-1, 1]) { const tip = new THREE.Mesh(rb(0.26, 0.3, 0.3, 0.1), trim); tip.position.set(sx * 0.78, 0, 0.42); g.add(tip); }
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 1.5, 12), new THREE.MeshStandardMaterial({ map: wrapTex('#20232a', '#5a606c'), roughness: 0.8 })); grip.rotation.x = Math.PI / 2; grip.position.z = -0.34; g.add(grip);
  const pm = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), trim); pm.position.z = -1.16; g.add(pm);
  g.userData = { len: len + 0.5 }; g.tip = v3(0, 0, len * 1.035 + 0.5); g.hilt2 = v3(0, 0, -0.85); g.core = core; g.halo = halo; g.blade = blade;
  g.setGlow = (k) => { core.emissiveIntensity = 0.5 + 0.9 * k; rim.opacity = 0.18 + 0.5 * k; };
  g.traverse((m) => { if (m.isMesh && m !== halo) m.castShadow = true; });
  return g;
}

// ---- armour ----
// plates made of several fragments each (so it can shatter), fitted to the bounding box of each body part
function partBox(group) {
  const b = new THREE.Box3(); group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  group.traverse((o) => { if (o.isMesh && o.geometry && !o.userData.armor) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld))); } });
  return b;
}
// direct children meshes only (a torso box must not include the arms and the head)
function ownBox(group) {
  const b = new THREE.Box3();
  for (const o of group.children) if (o.isMesh && o.geometry && !o.userData.armor) { o.geometry.computeBoundingBox(); b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrix)); }
  return b;
}

export function armorSuit(ch, o = {}) {
  const r = rng(o.seed ?? 32);
  const dark = new THREE.MeshStandardMaterial({ color: o.color || '#2c2f36', metalness: 0.88, roughness: 0.34 });
  const trim = new THREE.MeshStandardMaterial({ color: o.trim || '#b9bfc9', metalness: 0.95, roughness: 0.22 });
  const inner = new THREE.MeshStandardMaterial({ color: '#030304', metalness: 0.2, roughness: 0.9 });
  const frags = [], all = [];
  const save = ch.arms.map((a) => a.quaternion.clone()).concat(ch.legs.map((l) => l.quaternion.clone()));
  ch.arms.forEach((a) => a.quaternion.identity()); ch.legs.forEach((l) => l.quaternion.identity());
  // a plate split into a grid of fragments (nx x ny) on the part's front (sign +1) or back (-1) or as a ring
  const plate = (parent, w, h, d, cx, cy, cz, mat, nx = 2, ny = 2, rad = 0.06) => {
    const out = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const fw = w / nx, fh = h / ny, m = new THREE.Mesh(rb(fw * 1.002, fh * 1.002, d, rad), mat);
      m.position.set(cx - w / 2 + fw * (i + 0.5), cy - h / 2 + fh * (j + 0.5), cz); m.castShadow = true; m.receiveShadow = true; m.userData.armor = true;
      parent.add(m); out.push(m);
      frags.push({ m, parent, base: m.position.clone(), q0: m.quaternion.clone(), v: v3(r() - 0.5, r() * 0.8 + 0.2, r() - 0.5), spin: v3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(9) });
    }
    all.push(...out); return out;
  };
  // torso: chest + back, a gorget, faulds on the hips
  const tb = ownBox(ch.torso), tw = tb.max.x - tb.min.x, th = tb.max.y - tb.min.y, td = tb.max.z - tb.min.z, tcx = (tb.min.x + tb.max.x) / 2, tcy = (tb.min.y + tb.max.y) / 2, tcz = (tb.min.z + tb.max.z) / 2;
  plate(ch.torso, tw * 1.1, th * 0.62, 0.22, tcx, tb.max.y - th * 0.31, tb.max.z + 0.05, dark, 3, 2, 0.08);
  plate(ch.torso, tw * 1.1, th * 0.62, 0.22, tcx, tb.max.y - th * 0.31, tb.min.z - 0.05, dark, 3, 2, 0.08);
  plate(ch.torso, tw * 0.9, th * 0.36, td * 1.08, tcx, tb.min.y + th * 0.2, tcz, dark, 3, 1, 0.1);   // the waist
  plate(ch.torso, tw * 1.14, 0.14, td * 1.2, tcx, tb.max.y - th * 0.62, tcz, trim, 3, 1, 0.05);      // a pale band under the chest
  plate(ch.torso, 0.16, th * 0.5, 0.1, tcx, tb.max.y - th * 0.32, tb.max.z + 0.18, trim, 1, 2, 0.04); // the chest's ridge
  plate(ch.torso, tw * 0.62, th * 0.16, td * 1.16, tcx, tb.max.y - th * 0.05, tcz, trim, 2, 1, 0.08); // the gorget
  ch.torsoBox = tb;
  // arms: a pauldron on top (three layered lames), a vambrace below, a gauntlet
  ch.arms.forEach((a, s) => {
    const b = ownBox(a), w = b.max.x - b.min.x, h = b.max.y - b.min.y, d = b.max.z - b.min.z, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, out = s ? 1 : -1;
    for (let k = 0; k < 3; k++) plate(a, w * (1.42 - k * 0.1), 0.34, d * (1.4 - k * 0.1), cx + out * 0.08, b.max.y - 0.1 - k * 0.3, cz, k === 0 ? dark : (k === 1 ? trim : dark), 2, 1, 0.12);
    plate(a, w * 1.16, h * 0.34, d * 1.16, cx, b.min.y + h * 0.36, cz, dark, 2, 1, 0.08);
    plate(a, w * 1.2, h * 0.16, d * 1.2, cx, b.min.y + h * 0.1, cz, dark, 1, 1, 0.08);
  });
  // legs: tassets (hanging from the waist), a knee cop, greaves
  ch.legs.forEach((l, s) => {
    const b = ownBox(l), w = b.max.x - b.min.x, h = b.max.y - b.min.y, d = b.max.z - b.min.z, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    plate(l, w * 1.16, h * 0.32, 0.16, cx, b.max.y - h * 0.18, b.max.z + 0.05, dark, 1, 2, 0.06);
    plate(l, w * 0.7, h * 0.12, 0.26, cx, b.max.y - h * 0.47, b.max.z + 0.08, trim, 1, 1, 0.08);
    plate(l, w * 1.14, h * 0.4, d * 1.14, cx, b.min.y + h * 0.26, cz, dark, 2, 2, 0.08);
  });
  // the helmet: a smooth featureless shell, no eye slit; a low ridge over the crown
  const hb = partBox(ch.head), hw = hb.max.x - hb.min.x, hh = hb.max.y - hb.min.y, hd = hb.max.z - hb.min.z, hcx = (hb.min.x + hb.max.x) / 2, hcy = (hb.min.y + hb.max.y) / 2, hcz = (hb.min.z + hb.max.z) / 2;
  const S = Math.max(hw, hd) * 1.12;
  const helm = new THREE.Group(); helm.position.set(hcx, hb.min.y + Math.min(hh, S * 1.05) / 2 - 0.02, hcz); ch.head.add(helm);
  const shell = plate(helm, S, Math.min(hh, S * 1.05) * 1.06, S, 0, 0, 0, dark, 2, 2, S * 0.3);
  const visor = new THREE.MeshStandardMaterial({ color: '#15171c', metalness: 0.95, roughness: 0.12 });   // a smooth dark faceplate: no eyes, no slit
  const face = plate(helm, S * 0.86, Math.min(hh, S * 1.05) * 0.8, 0.12, 0, -0.04, S / 2 + 0.02, visor, 1, 1, S * 0.12);
  const ridge = plate(helm, 0.16, 0.2, S * 0.96, 0, Math.min(hh, S * 1.05) * 0.54, 0, trim, 1, 2, 0.06);
  // the helmet's inside: darkness (seen when it lies on the ground or the shell is gone)
  const hollow = new THREE.Mesh(rb(S * 0.94, Math.min(hh, S * 1.05) * 0.98, S * 0.94, S * 0.28), inner); hollow.userData.armor = true; helm.add(hollow);
  // a torn dark cape from the shoulders
  const capeG = new THREE.PlaneGeometry(tw * 1.0, ch.hipY * 1.55 + th * 0.6, 6, 14); capeG.translate(0, -(ch.hipY * 1.55 + th * 0.6) / 2, 0);
  const capeT = canvasTex(128, 256, (x, w, h) => { x.fillStyle = '#0c0d12'; x.fillRect(0, 0, w, h); const rr = rng(7); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 9; i++) { const cx2 = rr() * w; x.beginPath(); x.moveTo(cx2 - 12, h); x.lineTo(cx2, h - 30 - rr() * 60); x.lineTo(cx2 + 12, h); x.fill(); } });
  const cape = new THREE.Mesh(capeG, new THREE.MeshStandardMaterial({ color: '#ffffff', map: capeT, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }));
  cape.position.set(tcx, tb.max.y - 0.1, tb.min.z - 0.24); cape.userData.armor = true; cape.castShadow = true; ch.torso.add(cape);
  const cp = capeG.attributes.position, c0 = Float32Array.from(cp.array);
  ch.arms.forEach((a, i) => a.quaternion.copy(save[i])); ch.legs.forEach((l, i) => l.quaternion.copy(save[2 + i]));
  const suit = {
    frags, all, helm, cape, hollow, dark, trim,
    // the cape in the wind (pure function of t); amt 0 = hangs still (frozen time)
    wind(t, amt = 1) { for (let i = 0; i < cp.count; i++) { const y = c0[i * 3 + 1], k = clamp(-y / 6); cp.setZ(i, c0[i * 3 + 2] - k * (0.9 + 0.5 * Math.sin(t * 3.1 + y * 0.8)) * amt - k * 0.4); cp.setX(i, c0[i * 3] + Math.sin(t * 4.2 + y * 1.3 + c0[i * 3]) * 0.18 * k * amt); } cp.needsUpdate = true; capeG.computeVertexNormals(); },
    visible(v) { for (const m of all) m.visible = v; cape.visible = v; hollow.visible = v; },
    // shards fly from where they were when the body stopped (call after posing; dt seconds since the shatter, 0 = whole)
    shatter(dt, o2 = {}) {
      const g2 = o2.gravity ?? 9, pow = o2.power ?? 7, slow = o2.slow ?? 1;
      for (const f of frags) {
        if (dt <= 0) { f.m.matrixAutoUpdate = true; f.m.position.copy(f.base); f.m.quaternion.copy(f.q0); continue; }
        const d = dt * slow; f.m.matrixAutoUpdate = false; f.parent.updateMatrixWorld(true);
        const W = f.parent.matrixWorld.clone(), local = new THREE.Matrix4().compose(f.base, f.q0, v3(1, 1, 1)), world = W.clone().multiply(local);
        const p = v3(), q = new THREE.Quaternion(), sc = v3(); world.decompose(p, q, sc);
        const out = p.clone().sub(o2.centre || p).setY(0).normalize().multiplyScalar(0.6);
        p.addScaledVector(f.v.clone().add(out), pow * d); p.y -= 0.5 * g2 * d * d; if (o2.floor !== undefined) p.y = Math.max(o2.floor + 0.1, p.y);
        q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(f.spin.x * d, f.spin.y * d, f.spin.z * d)));
        world.compose(p, q, sc); f.m.matrix.copy(W.invert().multiply(world));
      }
    },
  };
  return suit;
}

// ---- the field of swords beneath the island ----
export function swordField(scene, o = {}) {
  const n = o.count ?? 2400, R = o.radius ?? 90, r = rng(o.seed ?? 5);
  const one = blackSword({ len: 4.4 }); one.updateMatrixWorld(true);
  const geos = { steel: [], iron: [], edge: [] };
  one.traverse((m) => { if (!m.isMesh) return; const g = m.geometry.clone().applyMatrix4(m.matrixWorld); for (const a of Object.keys(g.attributes)) if (!['position', 'normal'].includes(a)) g.deleteAttribute(a); const ng = g.index ? g.toNonIndexed() : g;
    (m.material === one.edge ? geos.edge : m.material === one.userData.steel ? geos.steel : geos.iron).push(ng); });
  const steel = new THREE.MeshStandardMaterial({ color: '#08080b', metalness: 0.9, roughness: 0.2 });
  const iron = new THREE.MeshStandardMaterial({ color: '#141418', metalness: 0.85, roughness: 0.4 });
  const glowM = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: true });
  const mk = (list, mt) => new THREE.InstancedMesh(mergeGeometries(list), mt, n);
  const I = { steel: mk(geos.steel, steel), iron: mk(geos.iron, iron), edge: mk(geos.edge, glowM) };
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), list = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const y = (o.floor ? o.floor(x, z) : 0), s = 0.8 + r() * 0.5, depth = 1.2 + r() * 2.2;
    // blade down into the rock: the sword's +z points (nearly) straight down, so the hilt stands up; a random turn and lean
    const down = v3((r() - 0.5) * 0.35, -1, (r() - 0.5) * 0.35).normalize();
    q.setFromUnitVectors(v3(0, 0, 1), down).premultiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), r() * Math.PI * 2));
    const p = v3(x, y + 4.4 * s - depth, z);
    M.compose(p, q, v3(s, s, s));
    for (const k of Object.keys(I)) I[k].setMatrixAt(i, M);
    list.push({ d, a, x, z });
  }
  // the waking glow: the whole blade, additive, black (invisible) until its sword wakes
  I.glow = new THREE.InstancedMesh(mergeGeometries(geos.steel).scale(1.06, 1.25, 1.0), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), n);
  for (let i = 0; i < n; i++) { I.steel.getMatrixAt(i, M); I.glow.setMatrixAt(i, M); }
  const g = new THREE.Group(); for (const k of Object.keys(I)) { I[k].userData.noAO = k === 'edge' || k === 'glow'; I[k].castShadow = k !== 'edge' && k !== 'glow'; g.add(I[k]); }
  I.edge.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); I.glow.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  if (o.parent) o.parent.add(g); else scene.add(g);
  const c = new THREE.Color(), cold = new THREE.Color('#2a2238'), hot = new THREE.Color(o.color || '#d8c8ff');
  return {
    group: g, list,
    // the wave: from the centre outward at `speed` studs a second; each sword flickers on, then holds
    wake(t, speed = 30, glow = 0.55) { const gc = new THREE.Color(); for (let i = 0; i < n; i++) { const L = list[i], k = clamp((t * speed - L.d) / 6), f = k > 0 ? (0.75 + 0.25 * Math.sin(t * 9 + i)) : 0; c.copy(cold).lerp(hot, k * f); I.edge.setColorAt(i, c); gc.copy(hot).multiplyScalar(k * f * glow); I.glow.setColorAt(i, gc); } I.edge.instanceColor.needsUpdate = true; I.glow.instanceColor.needsUpdate = true; },
  };
}
