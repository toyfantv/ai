// The Most Common Name (Flower Man remake 5): in Pebble Creek your last name is your superpower; Ezra Wilson's seems to do nothing.
//   pebbleStreet()  the town (origin): the road along x, the welcome sign (.welcome), the Gardners' cottage and pumpkin patch
//                   (.pumpkin.grow(k)), Taylor Tailoring with its mannequin (.mannequin.suit(k)) and fabric bolt, the Wilsons' cottage and
//                   mailbox, the school (SCHOOL) with steps, sign, flagpole, the PRINCIPAL W. WILSON plaque, a bendable lamp post
//                   (.lampPost.set(k)) and an open trash can (.can) on the forecourt
//   parkSet()       the memory park: lawn, path, pond (PARK.pond), trees, a bench, flower beds
//   cornMaze()      the memory maze: instanced corn walls round a corridor along z (CORN.halfW), EXIT signs pointing both ways, hay bales
//   alley()         behind the arcade: brick back wall (ALLEY.wallZ) with the back door and a neon ARCADE sign, side walls, a dumpster,
//                   crates, puddles, and the stop sign Brock ties in a knot (.stop.set(k))
//   creatures/props: goose() (.set(t, { run, honk, flap, reach, cradle })), fryingPan(), pancake(), whistle(), coffeeMug(), wilsonSign()
//                   (.show(stage)), wearFrillyApron(c), wearBunnySlippers(c), poofCloud() (.set(k))
import * as THREE from 'three';
import { v3, rng, clamp, lerp } from './core.js';
import { Batch, surf, paint, lamp, sign, building } from './kit.js';
import { canvasTex } from './props.js';
import { cottage, picket, flowers, mailbox } from './pastel.js';

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
function textPlate(text, w, h, o = {}) {   // a flat painted sign, faces +z
  const W = 512, Hh = Math.round(512 * h / w);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ roughness: 0.55, map: canvasTex(W, Hh, (x) => {
    x.fillStyle = o.bg || '#ffffff'; x.fillRect(0, 0, W, Hh); if (o.edge) { x.strokeStyle = o.edge; x.lineWidth = Hh * 0.06; x.strokeRect(Hh * 0.05, Hh * 0.05, W - Hh * 0.1, Hh - Hh * 0.1); }
    x.fillStyle = o.fg || '#222'; x.textAlign = 'center'; x.textBaseline = 'middle'; const lines = String(text).split('\n'); let s = Hh * (lines.length > 1 ? 0.34 : 0.55); x.font = FONT(s);
    const wd = Math.max(...lines.map((l) => x.measureText(l).width)); if (wd > W * 0.88) { s *= W * 0.88 / wd; x.font = FONT(s); }
    lines.forEach((l, i) => x.fillText(l, W / 2, Hh / 2 + (i - (lines.length - 1) / 2) * s * 1.12)); }) }));
  m.receiveShadow = true; return m;
}

// ---------------- a pole that bends: straight -> a shape (lamp post wilting, stop sign knotted) ----------------
function bendPole(straight, bent, radius, mat) {
  const g = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
  const top = new THREE.Group(); g.add(top); g.top = top;
  let lastK = -1;
  g.set = (k) => {
    k = clamp(k); if (Math.abs(k - lastK) < 1e-4) return; lastK = k;
    const pts = straight.map((p, i) => p.clone().lerp(bent[i], k)), curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(curve, 90, radius, 10, false);
    const end = curve.getPoint(1), tan = curve.getTangent(1).normalize();
    top.position.copy(end); top.quaternion.setFromUnitVectors(v3(0, 1, 0), tan);
    g.curve = curve;
  };
  g.set(0);
  return g;
}
const ups = (n, h) => Array.from({ length: n }, (_, i) => v3(0, (h * i) / (n - 1), 0));

export function lampPost() {   // a street lamp that wilts like a flower (bent over by Brock); local: base at the origin, the head ends on +x
  const m = paint('#2e5f8a', { metalness: 0.5, roughness: 0.4 });
  const bent = [v3(0, 0, 0), v3(0, 1.9, 0), v3(0, 3.8, 0), v3(0.15, 5.6, 0), v3(1.2, 7.3, 0), v3(2.9, 7.9, 0), v3(4.3, 7.0, 0), v3(4.9, 5.3, 0)];
  const g = bendPole(ups(8, 13), bent, 0.2, m);
  const base = new Batch(); base.cyl(m, 0.42, 0.55, 1.0, 0, 0.5, 0); base.done(g);
  const hb = new Batch(); hb.cyl(m, 0.12, 0.62, 0.55, 0, 0.1, 0); hb.cyl(paint('#f4f0e2', { roughness: 0.3 }), 0.4, 0.25, 0.6, 0, 0.55, 0); hb.cyl(m, 0.18, 0.18, 0.3, 0, 1.0, 0); hb.done(g.top);
  return shadowAll(g);
}
export function stopSign() {   // a stop sign on a pole; .set(k) ties the pole in a knot. Local: base at the origin, the sign faces +z when straight
  const m = paint('#b9bec6', { metalness: 0.7, roughness: 0.35 });
  const knot = [v3(0, 0, 0), v3(0, 1.8, 0), v3(0.1, 3.4, 0.1), v3(1.0, 4.6, 0.5), v3(0.2, 5.6, 1.1), v3(-0.9, 4.8, 0.4), v3(-0.3, 3.9, -0.4), v3(0.8, 4.4, -0.3), v3(1.2, 5.6, 0.4), v3(0.6, 6.6, 1.0)];
  const g = bendPole(ups(10, 9.2), knot, 0.13, m);
  const b = new Batch(); b.cyl(paint('#6c7078', { roughness: 0.8 }), 0.35, 0.45, 0.35, 0, 0.17, 0); b.done(g);
  const face = new THREE.Group(); face.position.set(0, 0.2, 0); g.top.add(face);
  const tex = canvasTex(256, 256, (x, W, H) => { x.translate(128, 128); x.fillStyle = '#ffffff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(Math.cos(a) * 124, Math.sin(a) * 124); } x.fill();
    x.fillStyle = '#d1262c'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(Math.cos(a) * 112, Math.sin(a) * 112); } x.fill(); x.fillStyle = '#ffffff'; x.font = FONT(74); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', 0, 6); });
  const plate = new THREE.Mesh(new THREE.CircleGeometry(1.25, 8, Math.PI / 8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, side: THREE.DoubleSide, transparent: false }));
  plate.rotation.x = -Math.PI / 2; plate.position.y = 1.2; plate.rotation.z = 0; face.add(plate);
  // the plate stands upright on top of the pole: rotate so its face looks along local +z of the pole's top frame
  plate.rotation.set(0, 0, 0); plate.position.set(0, 1.25, 0.08);
  const back = new THREE.Mesh(new THREE.CircleGeometry(1.25, 8, Math.PI / 8), paint('#9aa0a8', { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })); back.position.set(0, 1.25, 0.02); face.add(back);
  g.face = face; return shadowAll(g);
}

// ---------------- the town ----------------
export const SCHOOL = { x: 95, front: -41 };   // the school's front face (z), its centre x
export function pebbleStreet() {
  const g = new THREE.Group(), b = new Batch(), r = rng(21);
  const asphalt = paint('#4a4e57', { roughness: 0.92 }), side = surf('concrete', '#d9d4ca'), grassM = surf('grass', '#7cc24f'), kerb = paint('#c7c1b6', { roughness: 0.8 });
  g.add(flat(grassM, 420, 260, 20, -0.02, 0));
  g.add(flat(asphalt, 360, 14, 20, 0.0, 0)); b.box(kerb, 360, 0.3, 0.5, 20, 0.15, -7.1); b.box(kerb, 360, 0.3, 0.5, 20, 0.15, 7.1);
  g.add(flat(side, 360, 6, 20, 0.02, -10)); g.add(flat(side, 360, 6, 20, 0.02, 10));
  for (let x = -150; x < 190; x += 9) b.box(paint('#f6f1e2', { roughness: 0.6 }), 4.2, 0.04, 0.35, x, 0.03, 0, { r: 0.01 });   // centre dashes
  // the welcome sign at the town's edge
  const wl = textPlate('WELCOME TO\nPEBBLE CREEK', 9, 4.4, { bg: '#2f7d5a', fg: '#fff4cc', edge: '#fff4cc' }); wl.position.set(-84, 5.2, 13.5); wl.rotation.y = 0.55; g.add(wl);
  for (const dx of [-4, 4]) b.box(surf('plank', '#8a6040'), 0.5, 6.4, 0.5, -84 + dx * Math.cos(0.55), 3.2, 13.5 - dx * Math.sin(0.55) - 0.3);
  flowers(g, Array.from({ length: 26 }, (_, i) => v3(-88 + (i % 13) * 0.7, 0, 15.5 + Math.floor(i / 13) * 0.9)), { seed: 3 });
  g.welcome = v3(-84, 4, 13.5);
  // the Gardners: a cottage, a picket fence, a pumpkin patch
  { const c = cottage({ seed: 4, wall: '#cdeec4', roof: '#a8574a', door: '#e8433a', w: 20 }); c.g.position.set(-50, 0, -34); g.add(c.g); }
  picket(b, -62, -38, -13.5, { gap: [-48.5, -45.5] });
  g.add(flat(surf('sand', '#8a6a48'), 14, 7, -52, 0.03, -19));
  for (let i = 0; i < 9; i++) { const x = -57 + (i % 5) * 2.4, z = -21 + Math.floor(i / 5) * 3.2 + (i % 2) * 0.5; if (Math.abs(x + 51) < 1.5 && Math.abs(z + 19) < 2) continue; b.add(paint('#f08a24', { roughness: 0.6 }), new THREE.SphereGeometry(0.55 + r() * 0.2, 12, 9).scale(1.2, 0.85, 1.2), x, 0.45, z); b.cyl(paint('#4a6a2a'), 0.06, 0.08, 0.35, x, 1.0, z); }
  const pk = new THREE.Group(); { const pb = new Batch(), pm = paint('#f2841f', { roughness: 0.55 }); for (let i = 0; i < 8; i++) pb.add(pm, new THREE.SphereGeometry(1, 20, 14).scale(0.55, 1, 0.55), Math.cos(i * Math.PI / 4) * 0.55, 0, Math.sin(i * Math.PI / 4) * 0.55);
    pb.cyl(paint('#4f6a2a', { roughness: 0.7 }), 0.14, 0.22, 0.6, 0, 1.1, 0, { rz: 0.2 }); pb.done(pk); }
  pk.position.set(-51, 0, -19); g.add(pk); g.pumpkin = pk;
  pk.grow = (k) => { const s = 0.35 + 2.4 * k; pk.scale.setScalar(s); pk.position.y = 0.95 * s * 0.92; };
  pk.grow(0);
  // Taylor Tailoring
  { const s = building({ seed: 5, floors: 2, w: 20, d: 14, wall: '#e6b9d6', style: 'stucco', trim: '#fff6ee', name: 'TAYLOR TAILORING', signBg: '#3a2f5a', signFg: '#ffe9a8', shutters: '#7a5ab0' }); s.position.set(-10, 0, -22); g.add(s); }
  { const aw = new Batch(); for (let i = 0; i < 6; i++) aw.box(paint(i % 2 ? '#ffffff' : '#7a5ab0', { roughness: 0.7 }), 2.2, 0.12, 3.0, -15.5 + i * 2.2 - 0.0, 9.0, -13.6, { rx: 0.35, r: 0.03 }); aw.done(g); }
  const man = new THREE.Group(); { const mb = new Batch(), wood = paint('#c49a6c', { roughness: 0.5 }), body = paint('#efe2cc', { roughness: 0.6 });
    mb.cyl(wood, 0.9, 1.0, 0.25, 0, 0.12, 0); mb.cyl(wood, 0.1, 0.1, 2.6, 0, 1.4, 0); mb.add(body, new THREE.SphereGeometry(1, 18, 12).scale(1.05, 1.5, 0.62), 0, 3.6, 0); mb.cyl(body, 0.25, 0.3, 0.6, 0, 5.2, 0); mb.add(wood, new THREE.SphereGeometry(0.36, 12, 8), 0, 5.6, 0); mb.done(man); }
  const suit = new THREE.Group(); { const sb = new Batch(), navy = paint('#2c3a6a', { roughness: 0.7 }); sb.add(navy, new THREE.SphereGeometry(1.06, 18, 12).scale(1.08, 1.5, 0.66), 0, 3.6, 0);
    sb.box(paint('#ffffff', { roughness: 0.6 }), 0.6, 1.4, 0.2, 0, 4.4, 0.66, { r: 0.05 }); sb.box(paint('#d63a3a', { roughness: 0.5 }), 0.24, 1.3, 0.16, 0, 4.2, 0.74, { r: 0.04 }); sb.add(paint('#ffd23f', { metalness: 0.7 }), new THREE.SphereGeometry(0.09, 8, 6), 0, 3.4, 0.72); sb.add(paint('#ffd23f', { metalness: 0.7 }), new THREE.SphereGeometry(0.09, 8, 6), 0, 2.9, 0.72); sb.done(suit); }
  man.add(suit); man.position.set(-4.5, 0, -11.2); man.rotation.y = -0.25; g.add(man); g.mannequin = man;
  const pieces = []; for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), paint(['#2c3a6a', '#d63a3a', '#ffffff', '#2c3a6a'][i % 4], { roughness: 0.7, side: THREE.DoubleSide })); p.castShadow = true; g.add(p); pieces.push(p); }
  man.suit = (k, t = 0) => {   // fabric flies in from the bolt and wraps the mannequin
    suit.visible = k > 0.85; suit.scale.setScalar(k > 0.85 ? lerp(1.2, 1, clamp((k - 0.85) / 0.15)) : 1);
    pieces.forEach((p, i) => { const u = clamp(k * 1.15 - i * 0.02); p.visible = k > 0.02 && k < 0.95; const a = i * 0.9 + u * 9, rr = lerp(3.2, 0.9, u);
      p.position.set(man.position.x + Math.cos(a) * rr, lerp(5.8, 3.6, u) + Math.sin(i * 1.7) * 0.6, man.position.z + Math.sin(a) * rr); p.rotation.set(a, a * 0.7, i); });
  };
  { const bolt = new Batch(); bolt.cyl(paint('#2c3a6a', { roughness: 0.7 }), 0.7, 0.7, 2.6, -13.5, 1.0, -11.0, { rz: Math.PI / 2, seg: 18 }); bolt.box(paint('#9a7a52', { roughness: 0.6 }), 3.2, 0.3, 1.8, -13.5, 0.15, -11.0); bolt.done(g); }
  // the Wilsons' cottage and mailbox
  { const c = cottage({ seed: 7, wall: '#bfe0f7', roof: '#5a6a9a', door: '#ffd23f', w: 20 }); c.g.position.set(30, 0, -34); g.add(c.g); }
  picket(b, 18, 42, -13.5, { gap: [28.5, 31.5] });
  { const mb = mailbox({ name: 'WILSON', color: '#3d8fe0' }); mb.position.set(25, 0, -12.2); mb.rotation.y = -Math.PI / 2; g.add(mb); }
  // houses across the road and trees
  for (const [x, col, rf] of [[-70, '#fde7a8', '#7a5a8a'], [-30, '#f7c6d4', '#5a7a5a'], [10, '#dccbf6', '#a8574a'], [50, '#ffd3b0', '#5a6a9a']]) { const c = cottage({ seed: x + 200, wall: col, roof: rf, w: 18 }); c.g.position.set(x, 0, 34); c.g.rotation.y = Math.PI; g.add(c.g); }
  for (const [x, z] of [[-75, -16], [-22, 16], [8, -15.5], [40, 17], [62, -16], [-60, 18], [70, 17], [-95, -18]]) tree(b, x, z, 6 + r() * 2, ['#5aa83a', '#6cb84a', '#4f9a3a'][Math.floor(r() * 3)], 0.9);
  for (let x = -90; x < 140; x += 30) { const l = lamp({ height: 12 }); l.position.set(x, 0, 12.6); l.rotation.y = Math.PI / 2; g.add(l); }
  // the school
  const S = SCHOOL;
  { const s = building({ seed: 9, floors: 3, w: 56, d: 20, wall: '#c96b4b', style: 'brick', trim: '#fff2dc', lit: 0.1, door: '#2a6fd8' }); s.position.set(S.x, 0, S.front - 10); g.add(s); }
  g.add(flat(surf('concrete', '#e8e2d6'), 56, 28, S.x, 0.03, -27));
  for (let i = 0; i < 3; i++) b.box(paint('#d2ccc0', { roughness: 0.8 }), 14 - i * 1.5, 0.42, 1.2, S.x, 0.21 + i * 0.42, S.front + 3.4 - i * 1.1, { r: 0.05 });
  { const s = sign('PEBBLE CREEK SCHOOL', { w: 22, h: 2.6, bg: '#1f4f8a', fg: '#ffffff' }); s.position.set(S.x, 9.7, S.front + 0.45); g.add(s); }
  const plaque = textPlate('PRINCIPAL\nW. WILSON', 3.6, 1.8, { bg: '#e8c04a', fg: '#3a2a10', edge: '#3a2a10' }); plaque.position.set(S.x + 4.8, 4.2, S.front + 0.5); g.add(plaque); g.plaque = plaque;
  b.cyl(paint('#d8dce2', { metalness: 0.8, roughness: 0.3 }), 0.13, 0.16, 22, S.x - 20, 11, S.front + 8);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(5, 3, 10, 2), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7, map: canvasTex(200, 120, (x, W, H) => { x.fillStyle = '#2a6fd8'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffd23f'; x.font = FONT(44); x.textAlign = 'center'; x.fillText('PCS', W / 2, 78); }) }));
  flag.position.set(S.x - 17.4, 19.5, S.front + 8); g.add(flag); g.flag = flag; flag.userData.base = flag.geometry.attributes.position.array.slice();
  for (const x of [S.x - 24, S.x + 24]) { b.box(paint('#b9bcc2', { roughness: 0.7 }), 0.3, 4.2, 18, x, 2.1, -27, { r: 0.05 }); }
  for (const [x, z] of [[S.x - 14, -17], [S.x + 14, -17]]) { b.box(surf('plank', '#a46a3a'), 6, 0.3, 1.6, x, 1.6, z, { r: 0.05 }); for (const dx of [-2.6, 2.6]) b.box(paint('#3a3d44'), 0.3, 1.6, 1.4, x + dx, 0.8, z); }
  const lp = lampPost(); lp.position.set(S.x - 11, 0, -13.2); lp.rotation.y = 0.5; g.add(lp); g.lampPost = lp;
  // the trash can: an open-topped bin (radius 1.55, height 3.4) with its lid on the ground
  const can = new THREE.Group(); { const cm = paint('#5e8a5a', { metalness: 0.35, roughness: 0.45, side: THREE.DoubleSide }); const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.4, 3.4, 28, 1, true), cm); wall.position.y = 1.7; can.add(wall);
    const cb = new Batch(); cb.cyl(cm, 1.4, 1.4, 0.12, 0, 0.06, 0, { seg: 28 }); cb.add(paint('#4a6e46', { metalness: 0.4, roughness: 0.4 }), new THREE.TorusGeometry(1.56, 0.08, 6, 32).rotateX(Math.PI / 2), 0, 3.4, 0);
    for (let i = 0; i < 4; i++) cb.box(paint('#4a6e46'), 0.12, 3.2, 0.16, Math.cos(i * Math.PI / 2 + 0.4) * 1.5, 1.7, Math.sin(i * Math.PI / 2 + 0.4) * 1.5, { r: 0.04 });
    cb.done(can); const lid = new Batch(); lid.cyl(paint('#4a6e46', { metalness: 0.4, roughness: 0.4 }), 1.62, 1.62, 0.16, 2.6, 0.5, 0.6, { seg: 28, rz: 0.45 }); lid.done(can);
    const tr = new Batch(); tr.add(paint('#f2efe6', { roughness: 0.9 }), new THREE.SphereGeometry(0.35, 8, 6), 2.0, 0.25, -1.2); tr.add(paint('#e8433a', { roughness: 0.6 }), new THREE.BoxGeometry(0.5, 0.5, 0.5), 1.6, 0.25, 1.6, 0.4); tr.done(can); }
  can.position.set(S.x - 5.5, 0, -14.5); g.add(can); g.can = can; g.canTop = 3.4; g.canR = 1.4;
  b.done(g);
  g.update = (t) => { const a = flag.geometry.attributes.position, B = flag.userData.base; for (let i = 0; i < a.count; i++) { const x = B[i * 3]; a.array[i * 3 + 2] = Math.sin(x * 1.3 - t * 4.5) * (x + 2.5) * 0.12; } a.needsUpdate = true; };
  return shadowAll(g);
}

// ---------------- the park (memory) ----------------
export const PARK = { pond: v3(14, 0, -10), R: 7 };
export function parkSet() {
  const g = new THREE.Group(), b = new Batch(), r = rng(31);
  g.add(flat(surf('grass', '#86c95a'), 260, 260, 0, -0.02, 0));
  g.add(flat(surf('sand', '#e2cfa4'), 6, 140, 0, 0.02, 0));   // the path along z
  const pond = new THREE.Mesh(new THREE.CircleGeometry(PARK.R, 40), new THREE.MeshStandardMaterial({ color: '#4aa8d8', roughness: 0.08, metalness: 0.2 })); pond.rotation.x = -Math.PI / 2; pond.position.set(PARK.pond.x, 0.05, PARK.pond.z); pond.receiveShadow = true; g.add(pond);
  b.add(paint('#b8a88a', { roughness: 0.9 }), new THREE.TorusGeometry(PARK.R, 0.35, 6, 40).rotateX(Math.PI / 2), PARK.pond.x, 0.12, PARK.pond.z);
  for (let i = 0; i < 6; i++) { const a = i * 1.1; b.add(paint('#3f8a3a', { roughness: 0.8 }), new THREE.CircleGeometry(0.6, 10).rotateX(-Math.PI / 2), PARK.pond.x + Math.cos(a) * 4, 0.08, PARK.pond.z + Math.sin(a) * 3.5); }
  for (const [x, z, h] of [[-12, -14, 7], [-16, 6, 8], [12, 12, 6.5], [-11, -40, 7.5], [16, -36, 7], [-20, 24, 8], [22, 28, 7], [-9, 40, 6], [26, -4, 7]]) tree(b, x, z, h, ['#5aa83a', '#6cb84a', '#7cc85a'][Math.floor(r() * 3)], 1.0);
  // a bench beside the path
  { const wd = surf('plank', '#b07a48'), ir = paint('#2f3640', { metalness: 0.5 }); b.box(wd, 5, 0.25, 1.6, -5.2, 1.6, -4, { r: 0.04, ry: Math.PI / 2 }); b.box(wd, 5, 1.4, 0.22, -6.0, 2.6, -4, { r: 0.04, ry: Math.PI / 2 }); for (const dz of [-2, 2]) b.box(ir, 1.6, 1.6, 0.2, -5.2, 0.8, -4 + dz, { r: 0.03 }); }
  flowers(g, Array.from({ length: 40 }, (_, i) => v3(-8 - (i % 8) * 0.8, 0, 14 + Math.floor(i / 8) * 0.8)), { seed: 9 });
  flowers(g, Array.from({ length: 30 }, (_, i) => v3(6 + (i % 6) * 0.8, 0, 20 + Math.floor(i / 6) * 0.8)), { seed: 11, colors: ['#ffd24a', '#ff8a5a', '#ffffff'] });
  { const l = lamp({ height: 10 }); l.position.set(4, 0, 6); g.add(l); }
  b.done(g); return shadowAll(g);
}

// ---------------- the corn maze (memory) ----------------
export const CORN = { halfW: 4.2 };
export function cornMaze() {
  const g = new THREE.Group(), r = rng(41);
  g.add(flat(surf('sand', '#b9945e'), 260, 260, 0, -0.02, 0));
  const spots = [];
  for (let z = -70; z < 40; z += 1.15) for (let row = 0; row < 5; row++) for (const s of [-1, 1]) { const x = s * (CORN.halfW + 0.8 + row * 1.3 + r() * 0.4); if (z > -6.6 && z < -0.4 && s > 0) continue; spots.push([x, z + r() * 0.5, 7.0 + r() * 2.2]); }
  for (let x = 5.5; x < 40; x += 1.2) for (let row = 0; row < 4; row++) for (const s of [-1, 1]) { const z = -3.5 + s * (3.4 + row * 1.3); spots.push([x, z + r() * 0.4, 7.0 + r() * 2.0]); }   // a side corridor toward +x
  for (let z = -70; z < 40; z += 1.15) for (let row = 0; row < 6; row++) for (const s of [-1, 1]) { const x = s * (14 + row * 1.4 + r() * 0.5); spots.push([x, z + r() * 0.5, 7.2 + r() * 2.0]); }
  const n = spots.length;
  const stalk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.13, 1, 5), paint('#8fa848', { roughness: 0.8 }), n);
  const leaf = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 2.6, 4, 1, true), new THREE.MeshStandardMaterial({ color: '#7f9e3a', roughness: 0.8, side: THREE.DoubleSide }), n * 3);
  const tassel = new THREE.InstancedMesh(new THREE.ConeGeometry(0.22, 1.0, 5), paint('#e8c86a', { roughness: 0.7 }), n);
  const cob = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 5).scale(1, 2.2, 1), paint('#f2cf4a', { roughness: 0.6 }), n);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  spots.forEach(([x, z, h], i) => {
    M.compose(v3(x, h / 2, z), q.identity(), v3(1, h, 1)); stalk.setMatrixAt(i, M);
    for (let k = 0; k < 3; k++) { e.set(0.25 + r() * 0.3, r() * 6.28, 0); q.setFromEuler(e); M.compose(v3(x, h * (0.45 + k * 0.18), z), q, v3(1, 1, 1)); leaf.setMatrixAt(i * 3 + k, M); leaf.setColorAt(i * 3 + k, c.set(['#7f9e3a', '#93ae48', '#6c8c30'][(i + k) % 3])); }
    M.compose(v3(x, h + 0.4, z), q.identity(), v3(1, 1, 1)); tassel.setMatrixAt(i, M);
    e.set(0.3, r() * 6.28, 0); q.setFromEuler(e); M.compose(v3(x + 0.18, h * 0.6, z), q, v3(1, 1, 1)); cob.setMatrixAt(i, M);
  });
  leaf.instanceColor.needsUpdate = true;
  for (const m of [stalk, leaf, tassel, cob]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; g.add(m); }
  const b = new Batch();
  for (const [x, z, txt, ry] of [[-3.4, -8, 'EXIT →', 0.15], [3.6, -14, '← EXIT', -0.2]]) { b.box(surf('plank', '#9a6a3a'), 0.3, 3.4, 0.3, x, 1.7, z); const p = textPlate(txt, 2.8, 1.1, { bg: '#ffe9a8', fg: '#7a2a1a', edge: '#7a2a1a' }); p.position.set(x, 3.6, z + 0.2); p.rotation.y = ry; g.add(p); }
  for (const [x, z] of [[-3.0, 24], [3.2, -22]]) b.box(paint('#d8b45a', { roughness: 0.95 }), 2.6, 1.6, 1.6, x, 0.8, z, { r: 0.2 });
  b.done(g); return shadowAll(g);
}

// ---------------- behind the arcade ----------------
export const ALLEY = { wallZ: -7, halfW: 13 };
export function alley() {
  const g = new THREE.Group(), b = new Batch();
  const brick = surf('brick', '#a85a48'), brick2 = surf('brick', '#8a5a6a'), conc = surf('concrete', '#8a8a86');
  g.add(flat(conc, 120, 120, 0, 0, 10));
  // the arcade's back wall (normal +z) with the back door
  b.box(brick, 40, 22, 1.2, 0, 11, ALLEY.wallZ - 0.6);
  b.box(paint('#3a3f48', { roughness: 0.5 }), 4.4, 7.2, 0.3, -7.5, 3.6, ALLEY.wallZ + 0.1, { r: 0.05 }); b.box(paint('#d8dce2', { metalness: 0.8, roughness: 0.3 }), 0.9, 0.18, 0.3, -6.0, 3.4, ALLEY.wallZ + 0.35, { r: 0.04 });
  b.box(paint('#5a5f68', { metalness: 0.5, roughness: 0.5 }), 5.5, 0.4, 2.0, -7.5, 7.8, ALLEY.wallZ + 1.0, { r: 0.05 });   // door canopy
  b.box(paint('#9aa0a8', { metalness: 0.6, roughness: 0.4 }), 3.6, 2.4, 1.2, 7.5, 13.5, ALLEY.wallZ + 0.6, { r: 0.1 });   // vent box
  for (let i = 0; i < 6; i++) b.cyl(paint('#6a7078', { metalness: 0.6, roughness: 0.4 }), 0.22, 0.22, 21, 15.5, 10.5, ALLEY.wallZ + 0.4);
  // side walls along z
  b.box(brick2, 1.2, 18, 34, -ALLEY.halfW - 0.6, 9, ALLEY.wallZ + 16); b.box(brick2, 1.2, 18, 34, ALLEY.halfW + 0.6, 9, ALLEY.wallZ + 16);
  // a dumpster, crates, a pallet
  { const dm = paint('#2f7d5a', { metalness: 0.3, roughness: 0.5 }); b.box(dm, 6.4, 3.6, 3.6, 9.0, 1.9, ALLEY.wallZ + 2.4, { r: 0.12 }); b.box(paint('#235e44', { roughness: 0.5 }), 6.6, 0.3, 3.8, 9.0, 3.85, ALLEY.wallZ + 2.4, { r: 0.08, rx: -0.08 }); for (const dx of [-2.6, 2.6]) b.cyl(paint('#222'), 0.3, 0.3, 0.3, 9.0 + dx, 0.15, ALLEY.wallZ + 3.8, { rz: Math.PI / 2 }); }
  for (const [x, z, s] of [[-11.2, ALLEY.wallZ + 4, 2.2], [-11.0, ALLEY.wallZ + 6.3, 1.8], [-11.2, ALLEY.wallZ + 4.2, 1.6]]) { const yy = s === 1.6 ? 2.2 + 0.8 : s / 2; b.box(surf('plank', '#a9743f'), s, s, s, x, yy, z, { r: 0.05 }); }
  b.box(surf('plank', '#b88a5a'), 3.2, 0.4, 3.2, 11.2, 0.2, ALLEY.wallZ + 9);
  // posters and graffiti-free colour on the wall
  for (const [x, y, col, txt] of [[1.0, 6.5, '#ffd23f', 'HIGH\nSCORE'], [4.4, 6.0, '#7ad8ff', 'NEW\nGAMES']]) { const p = textPlate(txt, 2.6, 3.4, { bg: col, fg: '#2a2a3a', edge: '#2a2a3a' }); p.position.set(x, y, ALLEY.wallZ + 0.03); p.rotation.z = (x - 2.5) * 0.04; g.add(p); }
  // the neon ARCADE sign
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.0), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, map: canvasTex(640, 192, (x, W, H) => { x.clearRect(0, 0, W, H); x.font = FONT(130); x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ff5ad8'; x.shadowBlur = 26; x.strokeStyle = '#ffc2f2'; x.lineWidth = 9; x.strokeText('ARCADE', W / 2, H / 2 + 6); x.fillStyle = 'rgba(255,120,220,0.25)'; x.fillText('ARCADE', W / 2, H / 2 + 6); }) }));
  neon.position.set(-1.5, 12.5, ALLEY.wallZ + 0.08); neon.userData.noAO = true; g.add(neon); g.neon = neon;
  b.box(paint('#2a2a33', { roughness: 0.6 }), 10.6, 3.4, 0.2, -1.5, 12.5, ALLEY.wallZ - 0.02, { r: 0.05 });
  // puddles
  for (const [x, z, s] of [[4.5, ALLEY.wallZ + 11, 2.2], [-6, ALLEY.wallZ + 14, 1.6]]) { const p = new THREE.Mesh(new THREE.CircleGeometry(s, 24), new THREE.MeshStandardMaterial({ color: '#5a6a80', roughness: 0.05, metalness: 0.5 })); p.rotation.x = -Math.PI / 2; p.scale.set(1.4, 1, 1); p.position.set(x, 0.03, z); p.receiveShadow = true; g.add(p); }
  // beyond the alley's mouth: a sunny street wall far behind (+z)
  b.box(surf('stucco', '#f2d6a2'), 60, 16, 1, 0, 8, ALLEY.wallZ + 48);
  const st = stopSign(); st.position.set(6.6, 0, ALLEY.wallZ + 7.2); st.rotation.y = -0.35; g.add(st); g.stop = st;
  b.done(g); return shadowAll(g);
}

// ---------------- creatures ----------------
// our own goose: a white body, a long S neck with a grey-brown head band, an orange bill that opens to honk, orange legs with webbed feet.
// Local: feet on y = 0, facing +z, about 3.1 tall standing.
export function goose() {
  const g = new THREE.Group(), white = paint('#f7f5ee', { roughness: 0.7 }), grey = paint('#d8d4cc', { roughness: 0.8 }), orange = paint('#f08a24', { roughness: 0.45 }), eyeM = paint('#111111', { roughness: 0.2 });
  const body = new THREE.Group(); body.position.set(0, 1.45, 0); g.add(body);
  { const b = new Batch(); b.add(white, new THREE.SphereGeometry(1, 22, 16).scale(0.8, 0.7, 1.25), 0, 0, 0); b.add(grey, new THREE.ConeGeometry(0.42, 0.9, 10).rotateX(-Math.PI / 2 - 0.4), 0, 0.2, -1.35); b.done(body); }
  const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.72, 0.25, 0.2); body.add(w); const b = new Batch(); b.add(grey, new THREE.SphereGeometry(0.6, 14, 10).scale(0.25, 0.6, 1.25), s * 0.1, -0.1, -0.2); b.done(w); return w; });
  const neck = new THREE.Group(); neck.position.set(0, 0.35, 0.95); body.add(neck);
  { const b = new Batch(); b.cyl(white, 0.22, 0.3, 1.3, 0, 0.6, 0); b.done(neck); }
  const head = new THREE.Group(); head.position.set(0, 1.3, 0); neck.add(head); g.head = head;
  { const b = new Batch(); b.add(white, new THREE.SphereGeometry(0.34, 16, 12).scale(0.9, 0.95, 1.15), 0, 0.05, 0.05); for (const s of [-1, 1]) { b.add(eyeM, new THREE.SphereGeometry(0.06, 8, 6), s * 0.25, 0.13, 0.17); b.add(paint('#5a4a3a', { roughness: 0.8 }), new THREE.BoxGeometry(0.06, 0.08, 0.22), s * 0.24, 0.26, 0.15, 0, 0, s * 0.5); } b.done(head); }
  const bill = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 10).rotateX(Math.PI / 2), orange); bill.position.set(0, 0.04, 0.55); head.add(bill);
  const low = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.48, 10).rotateX(Math.PI / 2), orange); low.position.set(0, -0.06, 0.48); head.add(low); g.low = low;
  const legs = [-1, 1].map((s) => { const l = new THREE.Group(); l.position.set(s * 0.32, 1.05, 0.05); g.add(l); const b = new Batch(); b.cyl(orange, 0.07, 0.07, 1.0, 0, -0.5, 0, { seg: 8 }); b.add(orange, new THREE.ConeGeometry(0.34, 0.55, 3).rotateX(Math.PI / 2).scale(1, 0.25, 1), 0, -1.02, 0.18); b.done(l); return l; });
  g.set = (t, o = {}) => {
    const run = o.run || 0, ph = t * 15;
    legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + i * Math.PI) * 0.8 * run; });
    body.position.y = 1.45 + Math.abs(Math.sin(ph)) * 0.12 * run; body.rotation.x = 0.12 * run;
    neck.rotation.x = lerp(-0.1, 0.95, o.reach || 0) + Math.sin(t * 2.2) * 0.04; head.rotation.x = -lerp(0, 0.9, o.reach || 0);
    const fl = o.flap || 0; wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * fl * (0.4 + 0.9 * Math.abs(Math.sin(t * 18))); w.rotation.y = (i ? 1 : -1) * fl * 0.3; });
    low.rotation.x = (o.honk || 0) * 0.55;
    legs.forEach((l) => { l.visible = !o.cradle; });
  };
  g.set(0);
  return shadowAll(g);
}

// ---------------- props ----------------
export function fryingPan() {   // local: the handle grip at the origin, the pan's centre on +z (about 2.2 along), its face up
  const g = new THREE.Group(), b = new Batch(), iron = paint('#24262b', { metalness: 0.6, roughness: 0.35 });
  b.cyl(iron, 1.0, 0.85, 0.28, 0, 0, 2.15, { seg: 28 }); b.cyl(paint('#3a3c42', { metalness: 0.5, roughness: 0.3 }), 0.88, 0.88, 0.02, 0, 0.15, 2.15, { seg: 28 });
  b.box(paint('#6a3a22', { roughness: 0.5 }), 0.28, 0.2, 1.4, 0, 0.05, 0.25, { r: 0.08 }); b.box(iron, 0.18, 0.12, 0.6, 0, 0.05, 1.1, { r: 0.04 });
  b.done(g); g.centre = v3(0, 0.18, 2.15); return shadowAll(g);
}
export function pancake() { const b = new Batch(); b.cyl(paint('#e0a24a', { roughness: 0.75 }), 0.7, 0.7, 0.16, 0, 0, 0, { seg: 24 }); b.cyl(paint('#c07a2a', { roughness: 0.8 }), 0.5, 0.5, 0.02, 0, 0.085, 0, { seg: 20 }); b.add(paint('#ffe7a0', { roughness: 0.4 }), new THREE.BoxGeometry(0.3, 0.1, 0.3), 0.1, 0.13, -0.05, 0.3); return shadowAll(b.done()); }
export function whistle() { const b = new Batch(); b.box(paint('#d8dce2', { metalness: 0.85, roughness: 0.25 }), 0.4, 0.25, 0.25, 0, 0, 0, { r: 0.08 }); b.cyl(paint('#d8dce2', { metalness: 0.85, roughness: 0.25 }), 0.16, 0.16, 0.25, -0.15, -0.05, 0, { rx: Math.PI / 2 }); return shadowAll(b.done()); }
export function coffeeMug() { const b = new Batch(); b.cyl(paint('#e8433a', { roughness: 0.3 }), 0.3, 0.27, 0.6, 0, 0.3, 0, { seg: 16 }); b.add(paint('#e8433a', { roughness: 0.3 }), new THREE.TorusGeometry(0.17, 0.05, 6, 12), 0.33, 0.32, 0); b.cyl(paint('#4a2a16', { roughness: 0.3 }), 0.25, 0.25, 0.02, 0, 0.56, 0); return shadowAll(b.done()); }
export function wilsonSign() {   // glowing letters: WILSON -> WIL SON -> WILL'S SON. .show(stage 0..2) crossfades; faces +z, about 7 wide
  const g = new THREE.Group(), mk = (draw) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.4), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, map: canvasTex(800, 240, (x, W, H) => { x.clearRect(0, 0, W, H); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; draw(x, W, H); }) })); m.userData.noAO = true; m.renderOrder = 5; g.add(m); return m; };
  const word = (x, txt, X, col) => { x.font = FONT(150); x.lineWidth = 22; x.strokeStyle = '#2a1a4a'; x.strokeText(txt, X, 130); x.shadowColor = col; x.shadowBlur = 30; x.fillStyle = col; x.fillText(txt, X, 130); x.shadowBlur = 0; };
  const a = mk((x, W) => word(x, 'WILSON', W / 2, '#ffe27a'));
  const b2 = mk((x, W) => { word(x, 'WIL', W / 2 - 170, '#ffe27a'); word(x, 'SON', W / 2 + 190, '#9ff7ff'); });
  const c = mk((x, W) => { x.font = FONT(120); word(x, "WILL'S", W / 2 - 160, '#ffe27a'); word(x, 'SON', W / 2 + 250, '#9ff7ff'); });
  c.scale.set(0.95, 0.95, 1);
  g.show = (s) => { a.material.opacity = clamp(1 - s); b2.material.opacity = clamp(1 - Math.abs(s - 1)); c.material.opacity = clamp(s - 1); g.visible = s > -0.99; };
  return g;
}
export function poofCloud() {   // a puff of sparkly white cloud for Dad's arrival: .set(k) 0..1
  const g = new THREE.Group(), r = rng(51), puffs = [];
  const tex = canvasTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,250,235,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); });
  for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: i % 4 ? '#fff6e6' : '#ffe6fa' })); s.userData.o = [r() * 6.28, r() * 0.9 + 0.1, 0.6 + r() * 0.8, 1.5 + r() * 1.5]; g.add(s); puffs.push(s); }
  g.set = (k) => { g.visible = k > 0.001 && k < 1; if (!g.visible) return; puffs.forEach((s) => { const [a, y, d, sz] = s.userData.o; const rr = d * (0.6 + k * 4.0); s.position.set(Math.cos(a) * rr, y * 6 * (0.3 + k * 0.8), Math.sin(a) * rr); s.scale.setScalar(sz * (0.6 + k * 1.8)); s.material.opacity = 0.95 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5 + 0.0) * (1 - k); }); };
  return g;
}

// ---------------- worn ----------------
function partBox(group, skip = []) { group.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3(); const under = (k) => { for (let q = k; q && q !== group; q = q.parent) if (skip.includes(q)) return true; return false; }; group.traverse((k) => { if (k.isMesh && !k.userData.worn && k !== group && !under(k)) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } }); return bx; }
const worn = (g) => { g.traverse((o) => { if (o.isMesh) { o.userData.worn = true; o.castShadow = true; } }); return g; };
const torsoBox = (c) => { const r = c.root.rotation.clone(); c.root.rotation.set(0, 0, 0); const b = partBox(c.torso, [c.head, c.neck, ...(c.arms || []), ...(c.legs || [])].filter(Boolean)); c.root.rotation.copy(r); return b; };
export function wearFrillyApron(c) {   // a pink apron with white frills, a bib and a heart pocket; .visible toggles it
  const B = torsoBox(c), g = new THREE.Group(), b = new Batch(), m = paint('#ff8fb8', { roughness: 0.75 }), wt = paint('#ffffff', { roughness: 0.8 }), w = (B.max.x - B.min.x), h = B.max.y - B.min.y;
  const z = B.max.z + 0.08;
  b.box(m, w * 0.62, h * 0.5, 0.1, 0, -h * 0.2, 0, { r: 0.05 });   // bib
  b.box(m, w * 1.0, h * 0.62, 0.1, 0, -h * 0.72, 0.02, { r: 0.06 });   // skirt to the hips
  for (let i = 0; i < 9; i++) b.add(wt, new THREE.SphereGeometry(w * 0.07, 8, 6).scale(1, 0.75, 0.5), -w * 0.5 + (i + 0.5) * w / 9, -h * 1.04, 0.05);   // the frill along the hem
  for (let i = 0; i < 5; i++) b.add(wt, new THREE.SphereGeometry(w * 0.06, 8, 6).scale(1, 0.75, 0.5), -w * 0.31 + (i + 0.5) * w * 0.62 / 5, h * 0.05, 0.04);   // the bib's frill
  for (const s of [-1, 1]) b.add(wt, new THREE.SphereGeometry(w * 0.075, 8, 6).scale(1, 1.6, 0.5), s * w * 0.31, -h * 0.2, 0.04);
  b.add(paint('#e8435a', { roughness: 0.6 }), new THREE.SphereGeometry(w * 0.07, 10, 8).scale(1, 1, 0.4), -w * 0.04, -h * 0.66, 0.08); b.add(paint('#e8435a', { roughness: 0.6 }), new THREE.SphereGeometry(w * 0.07, 10, 8).scale(1, 1, 0.4), w * 0.04, -h * 0.66, 0.08);
  b.add(paint('#e8435a', { roughness: 0.6 }), new THREE.ConeGeometry(w * 0.1, w * 0.12, 4).rotateZ(Math.PI).scale(1, 1, 0.4), 0, -h * 0.71, 0.08);
  b.done(g); g.position.set((B.min.x + B.max.x) / 2, B.max.y - 0.1, z); c.torso.add(worn(g)); return g;
}
export function wearBunnySlippers(c) {   // fuzzy pink bunny slippers on both feet (on the shins under the knees, from jointify)
  const out = [];
  c.knee.forEach((k, i) => {
    const bx = partBox(k), w = (bx.max.x - bx.min.x), d = (bx.max.z - bx.min.z);
    const g = new THREE.Group(), b = new Batch(), fur = paint('#ffc2dc', { roughness: 0.95 }), wt = paint('#ffffff', { roughness: 0.95 });
    b.add(fur, new THREE.SphereGeometry(1, 16, 12).scale(w * 0.62, w * 0.42, d * 0.85), 0, 0, d * 0.12);
    for (const s of [-1, 1]) { b.add(fur, new THREE.SphereGeometry(1, 10, 8).scale(w * 0.12, w * 0.5, w * 0.08), s * w * 0.18, w * 0.55, d * 0.35, 0, 0, s * -0.25); b.add(paint('#ff7ab0', { roughness: 0.9 }), new THREE.SphereGeometry(1, 8, 6).scale(w * 0.06, w * 0.36, w * 0.05), s * w * 0.18, w * 0.55, d * 0.42, 0, 0, s * -0.25); }
    for (const s of [-1, 1]) b.add(paint('#111', { roughness: 0.3 }), new THREE.SphereGeometry(w * 0.05, 8, 6), s * w * 0.15, w * 0.2, d * 0.78);
    b.add(paint('#ff5a9a', { roughness: 0.5 }), new THREE.SphereGeometry(w * 0.06, 8, 6), 0, w * 0.1, d * 0.92); b.add(wt, new THREE.SphereGeometry(w * 0.13, 8, 6), 0, w * 0.1, -d * 0.6);
    b.done(g); g.position.set((bx.min.x + bx.max.x) / 2, bx.min.y + w * 0.2, (bx.min.z + bx.max.z) / 2); k.add(worn(g)); out.push(g);
  });
  return out;
}
