// Episode 17: The Midnight Package. Emily is the first real Roblox avatar in the series (CAST.emily, the farm cast's emma).
// Three copies of one house: the real one in the town, a tenth-scale cutaway on Emily's table (the model in the box), and
// a full-size cutaway far away that stands in for the model's inside (no macro lens: a giant Emily looks down into it).
import * as THREE from 'three';
import { clamp, lerp, smooth, easeInOut, easeOut, v3, mat, box, noise1 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { CAST } from '../engine/cast.js';
import { buildTown, buildHeroHouse } from '../engine/town.js';
import { initStage, applyEnv, shotAt, frame, expose, P, mixP, NIGHT } from '../engine/stage.js';
import { canvasTex, glowSprite } from '../engine/props.js';

let ctx, L, EV;
const W = {};
const HX = 60, HZ = -24, MX = 1100, MZ = 1100;
const H = (x, y, z) => v3(HX + x, y, HZ + z);          // the real house
const M = (x, y, z) => v3(MX + x, y, MZ + z);          // the model's inside, at full size
const TABLE = { x: 3.2, z: 0.8, y: 2.9 };
const T = (x = 0, y = 0, z = 0) => H(TABLE.x + x, TABLE.y + y, TABLE.z + z);   // on the table
const S = 0.1;                                         // the model's scale
const GIANT = 1 / S;
const TOPS = 450;                                      // Emily, as she looks in

const EXT = { ...NIGHT, ...P({ top: '#0b1236', horizon: '#2c3a78', haze: '#1c2858', hemiSky: '#46589e', hemiGround: '#141a30', sunColor: '#a9bcff' }),
  hemiI: 1.05, sunI: 0.9, vig: 0, exposure: 1.2, bloom: 0.3, fogNear: 180, fogFar: 760 };
const INT = { ...EXT, ...P({ hemiSky: '#ffe6cc', hemiGround: '#8a6a55', sunColor: '#ffe0c0' }), hemiI: 1.3, amb: 0.3, sunI: 0.35, exposure: 1.1, bloom: 0.16 };
const MAC = { ...INT, ...P({ hemiSky: '#ffe9d2', hemiGround: '#a07858', sunColor: '#fff0dc', haze: '#d9a778' }), hemiI: 1.25, sunI: 1.3, sunDir: v3(0.25, 0.9, 0.35), fogNear: 900, fogFar: 3000 };
const OPEN = { ...EXT, ...P({ hemiSky: '#ffd9a8', hemiGround: '#8a6a50', sunColor: '#ffdcae', haze: '#3a3560', horizon: '#3a3a78' }), hemiI: 1.5, amb: 0.3, sunI: 2.3, sunDir: v3(0.1, 0.95, 0.12),
  exposure: 1.1, bloom: 0.35, fogNear: 1500, fogFar: 5200, win: 0.6 };

function events() {
  const k = L(4).start + 1.72;
  return { knock1: k, knock2: k + 0.33, knock3: k + 0.66, lid: L(7).start + 0.25, fold: L(8).start - 0.1, lookup: L(15).start + 0.45, shake: L(16).start,
    top1: L(20).end + 0.05, top2: L(20).end + 0.5, top3: L(20).end + 0.95, seam: L(22).start + 0.2, flaps: L(23).start + 0.7, end: ctx.dur };
}

// ---------- props ----------
function makeBox(parent) {
  const g = new THREE.Group(); parent.add(g);
  const out = mat('#17171d', { caustic: false }), inn = mat('#3a3038', { caustic: false }), gold = mat('#a98a4a', { caustic: false });
  box(2, 0.06, 2, inn, 0, 0.03, 0, g);
  const P4 = [[0, 1, 'x', 1], [0, -1, 'x', -1], [1, 0, 'z', -1], [-1, 0, 'z', 1]].map(([x, z, ax, sg]) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
    const side = ax === 'z';
    box(side ? 0.05 : 2, 1.7, side ? 2 : 0.05, out, 0, 0.85, 0, p);
    box(side ? 0.02 : 1.96, 1.66, side ? 1.96 : 0.02, inn, side ? -sg * -0.035 * -1 : 0, 0.85, side ? 0 : -sg * 0.035, p);
    return { p, ax, sg };
  });
  // the label: no return address
  const lab = canvasTex(512, 320, (c, w, h) => {
    c.fillStyle = '#efe7d4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a2420'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#2a2420'; c.font = '900 42px ITTInter, sans-serif'; c.textAlign = 'left'; c.fillText('RETURN ADDRESS:', 34, 74);
    c.fillRect(34, 138, w - 68, 5); c.fillRect(34, 206, w - 68, 5); c.fillRect(34, 274, w - 68, 5);
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshStandardMaterial({ map: lab, roughness: 0.8 }));
  label.position.set(0, 0.92, 0.035); P4[0].p.add(label);
  const lid = new THREE.Group(); lid.position.y = 1.7; g.add(lid);
  box(2.14, 0.22, 2.14, out, 0, 0.11, 0, lid);
  box(0.16, 0.24, 2.16, gold, 0, 0.11, 0, lid); box(2.16, 0.24, 0.16, gold, 0, 0.11, 0, lid);
  return { g, lid, open(a) { P4.forEach(({ p, ax, sg }) => { p.rotation[ax] = sg * a; }); } };
}

// A house as a model: no roof, ceiling, hedge or lights.
function cutaway(house) {
  for (const c of [...house.group.children]) {
    if (c.isLight) { c.intensity = 0; c.visible = false; continue; }
    const p = c.position, gp = c.geometry && c.geometry.parameters;
    if (!gp) continue;
    if (gp.radialSegments || (p.y > 13.6 && gp.height < 1)) house.group.remove(c);
    else if (p.z > 11 && p.y < 1) house.group.remove(c);   // hedge
  }
  return house;
}

// Same covers and card in all three houses (the channel's easter eggs).
function dress(house, tex) {
  house.group.traverse((o) => {
    const gp = o.geometry && o.geometry.parameters;
    if (o.isMesh && gp && gp.width === 2.4 && gp.height === 3) { o.material = new THREE.MeshStandardMaterial({ map: tex.llama, roughness: 0.7 }); }
    if (o.isMesh && gp && gp.width === 2.6 && gp.height === 2) { o.material = new THREE.MeshStandardMaterial({ map: tex.song, roughness: 0.7 }); }
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), new THREE.MeshStandardMaterial({ map: tex.card, roughness: 0.6 }));
  card.position.set(5.6, 10.2, 3.05); card.rotation.y = Math.PI; house.group.add(card);
}

function armOnly(ch) {
  const keep = ch.arms[1];
  ch.root.traverse((o) => {
    if (!o.isMesh) return;
    let p = o, mine = false;
    while (p) { if (p === keep) mine = true; p = p.parent; }
    o.visible = mine;
  });
  return ch;
}

// Holds a lone arm out straight and puts its fingertips on a point (yaw swings the arm round the point).
function reach(c, yaw, tip) {
  pose(c, 'still', 0);
  c.arms[1].rotation.set(-1.57, 0, 0);
  c.root.rotation.set(0, Math.PI + yaw, 0); c.root.position.set(0, 0, 0);
  c.root.updateWorldMatrix(true, true);
  const b = new THREE.Box3().setFromObject(c.arms[1]);
  const end = v3((b.min.x + b.max.x) / 2 - Math.sin(yaw) * (b.max.z - b.min.z) * 0.5, (b.min.y + b.max.y) / 2, b.min.z);
  c.root.position.copy(tip).sub(end);
}

async function loadTex(url) {
  const t = await new THREE.TextureLoader().loadAsync(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

async function build() {
  const { scene } = ctx;
  const town = buildTown(scene, { sign: null, seed: 17 });
  W.house = town.emma;
  const tex = {
    llama: await loadTex('/web/assets/eggs/llamacorn.jpg'), song: await loadTex('/web/assets/eggs/roblox_song.jpg'),
    card: canvasTex(512, 224, (c, w, h) => { c.fillStyle = '#16161c'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23f'; c.font = '900 76px ITTInter, sans-serif'; c.textAlign = 'center'; c.fillText('TOY FAN TV', w / 2, 138); }),
  };
  dress(W.house, tex);
  // the door's window and handle swing with it
  for (const c of [...W.house.group.children]) {
    const gp = c.geometry && c.geometry.parameters;
    if (gp && ((gp.width === 1.4 && gp.height === 1.2) || (gp.width === 0.25 && gp.depth === 0.5))) W.house.door.attach(c);
  }
  W.house.warmDown.intensity = 42; W.house.warmUp.intensity = 34;
  W.porch = new THREE.PointLight('#ffd8a8', 22, 18, 1.4); W.porch.position.copy(H(2.1, 6, 9.6)); scene.add(W.porch);

  // the table in the living room
  const tb = new THREE.Group(); tb.position.copy(H(TABLE.x, 0, TABLE.z)); scene.add(tb);
  const wood = mat('#7a4f30', { caustic: false });
  box(4.2, 0.2, 4.2, wood, 0, TABLE.y - 0.1, 0, tb);
  for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) box(0.26, TABLE.y - 0.2, 0.26, wood, x, (TABLE.y - 0.2) / 2, z, tb);

  // the box: on the mat, then on the table
  W.porchBox = makeBox(scene); W.porchBox.g.position.copy(H(2.1, 0.35, 8.3)); W.porchBox.g.scale.setScalar(0.78);
  W.tableBox = makeBox(scene); W.tableBox.g.position.copy(T()); W.tableBox.g.scale.setScalar(1);

  // the rule: an opened package, a name card inside
  W.rule = makeBox(scene); W.rule.g.position.copy(v3(HX + 14, 0.32, -13.2)); W.rule.lid.visible = false; W.rule.open(0.12);
  const cardT = canvasTex(768, 480, (c, w, h) => {
    c.fillStyle = '#efe7d4'; c.fillRect(0, 0, w, h); c.fillStyle = '#b3121b'; c.textAlign = 'center'; c.font = '900 118px ITTInter, sans-serif'; c.fillText('YOUR', w / 2, 200); c.fillText('NAME', w / 2, 330);
  });
  const cardM = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ map: cardT, toneMapped: false }));
  cardM.rotation.x = -Math.PI / 2 + 0.25; cardM.position.y = 0.42; W.rule.g.add(cardM);
  const rg = glowSprite('#ff3044', 3.4, 0.5); rg.position.y = 0.9; W.rule.g.add(rg);

  // a package on every doorstep, nearest first
  const mk = [];
  const bm = mat('#17171d', { caustic: false }), gm = mat('#a98a4a', { caustic: false });
  for (const side of [-1, 1]) for (let x = -204; x <= 204; x += 24) {
    if (Math.abs(x) < 34 || (side === -1 && x === 60)) continue;
    const g = new THREE.Group(); g.position.set(x, 0.36, side * 11.2); scene.add(g); g.userData.s = 1.35;
    box(1.8, 1.4, 1.8, bm, 0, 0.7, 0, g); box(0.16, 1.44, 1.84, gm, 0, 0.7, 0, g); box(1.84, 1.44, 0.16, gm, 0, 0.7, 0, g);
    const s = glowSprite('#ffd27a', 6, 0.5); s.position.y = 1.2; g.add(s);
    mk.push({ g, order: 204 - x + (side > 0 ? 6 : 0) });
  }
  mk.sort((a, b) => a.order - b.order);
  W.boxes = mk;

  // the model on the table
  const holder = new THREE.Group(); holder.position.copy(T(0, 0.06, -0.15)); holder.scale.setScalar(S); scene.add(holder);
  W.model = cutaway(buildHeroHouse(holder, 0, 0)); dress(W.model, tex); W.holder = holder;
  W.modelGlow = glowSprite('#ffd9a0', 4.6, 0.0); W.modelGlow.position.copy(T(0, 0.9, 0)); scene.add(W.modelGlow);
  W.tiny = makeCharacter({ ...CAST.emily, scale: 1, caustic: false }); holder.add(W.tiny.root);

  // inside the model, at full size: the same house on a table the size of a town
  W.macro = cutaway(buildHeroHouse(scene, MX, MZ)); dress(W.macro, tex);
  const room = new THREE.Mesh(new THREE.SphereGeometry(330, 32, 16), new THREE.MeshBasicMaterial({ color: '#c79468', side: THREE.BackSide, fog: false })); room.position.copy(M(0, 0, 0)); scene.add(room);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(640, 640), mat('#7a4f30', { caustic: false })); top.rotation.x = -Math.PI / 2; top.position.copy(M(0, 0.03, 0)); top.receiveShadow = true; scene.add(top);
  W.macroBox = makeBox(scene); W.macroBox.g.position.copy(M(0, 0.04, 1.5)); W.macroBox.g.scale.setScalar(GIANT); W.macroBox.lid.visible = false; W.macroBox.open(1.25);
  W.macroLight = new THREE.PointLight('#ffdcb8', 60, 34, 1.4); W.macroLight.position.copy(M(0, 13, 1)); scene.add(W.macroLight);
  W.me = makeCharacter({ ...CAST.emily, caustic: false }); scene.add(W.me.root);             // the tiny Emily, seen from inside
  W.giant = makeCharacter({ ...CAST.emily, scale: GIANT, caustic: false }); scene.add(W.giant.root);
  W.armT = armOnly(makeCharacter({ ...CAST.emily, caustic: false })); scene.add(W.armT.root);

  // Emily
  W.em = makeCharacter({ ...CAST.emily, caustic: false }); scene.add(W.em.root);

  // the sky is a box: two pairs of flaps with night on the inside, a lit room beyond
  const C = v3(HX, 300, -300), A = 520; W.skyC = C;
  const night = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#0d1540'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const a = 0.3 + 0.7 * Math.abs(Math.sin(i * 12.9898)); c.fillStyle = `rgba(255,255,255,${a})`; const s = 1 + (i % 3); c.fillRect(Math.abs(Math.sin(i * 78.233)) * w, Math.abs(Math.sin(i * 39.425)) * h, s, s); }
    // the sky is printed on cardboard: bare kraft at the edges
    c.strokeStyle = '#b98a5a'; c.lineWidth = 46; c.strokeRect(0, 0, w, h);
  });
  night.anisotropy = 16;
  const nightM = new THREE.MeshBasicMaterial({ map: night, fog: false, side: THREE.DoubleSide, toneMapped: false });
  const card = new THREE.MeshBasicMaterial({ color: '#b98a5a', fog: false, toneMapped: false });
  const flap = (ax, sg, y) => {
    const p = new THREE.Group(); p.position.copy(C); p.position.y = y; p.position[ax] += sg * A; scene.add(p);
    const m = new THREE.Mesh(new THREE.BoxGeometry(ax === 'x' ? A : 2 * A, 16, ax === 'x' ? 2 * A : A), [card, card, card, nightM, card, card]);
    m.position[ax] = -sg * A / 2; p.add(m);
    return { p, ax, sg };
  };
  W.flaps = [flap('x', 1, C.y + 18), flap('x', -1, C.y + 18), flap('z', 1, C.y), flap('z', -1, C.y)];
  W.tape = new THREE.Mesh(new THREE.PlaneGeometry(10, 2 * A), new THREE.MeshBasicMaterial({ color: '#ffe2b0', fog: false, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide }));
  W.tape.rotation.x = Math.PI / 2; W.tape.position.copy(C); W.tape.position.y = C.y + 9; scene.add(W.tape);
  // the box's walls keep the rest of the giant out of the night
  W.walls = new THREE.Group(); scene.add(W.walls);
  const wm = new THREE.MeshBasicMaterial({ color: '#141c4c', fog: false, side: THREE.DoubleSide });
  const wall = (x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * A, C.y + 60), wm); m.position.set(x, (C.y - 60) / 2, z); m.rotation.y = ry; W.walls.add(m); };
  wall(C.x, C.z - A, 0); wall(C.x + A, C.z, Math.PI / 2); wall(C.x - A, C.z, Math.PI / 2);
  const beyond = canvasTex(1024, 1024, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.62); g.addColorStop(0, '#fff2d8'); g.addColorStop(0.45, '#f0c48c'); g.addColorStop(1, '#a8703f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  W.beyond = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshBasicMaterial({ map: beyond, fog: false, side: THREE.DoubleSide, toneMapped: false }));
  W.beyond.rotation.x = Math.PI / 2; W.beyond.position.set(C.x, 3400, C.z); scene.add(W.beyond);
  W.top = makeCharacter({ ...CAST.emily, scale: TOPS, caustic: false }); scene.add(W.top.root);
  W.faceLight = new THREE.DirectionalLight('#ffe6c8', 0); W.faceLight.position.copy(H(0, 0, 500)); W.faceLight.target.position.set(HX, 1120, -600); scene.add(W.faceLight, W.faceLight.target);
  W.dust = [];
  for (let i = 0; i < 26; i++) { const s = glowSprite('#efe2cc', 0.2, 0.7); scene.add(s); W.dust.push({ s, x: noise1(i * 3.1) * 3.5, z: noise1(i * 5.3 + 2) * 3.5, ph: (i * 0.137) % 1 }); }
}

// The tiny Emily's walk, from the bedroom floor to the window. Shots read this, never a character: a frame must depend on t alone.
function walk(t) {
  const u = smooth(L(13).start + 0.1, L(14).end + 0.1, t);
  return { x: lerp(-1.2, 0.2, u), z: lerp(-1.6, 4.2, u) };
}

// ---------- shots ----------
const lp3 = (a, b, u) => a.clone().lerp(b, u);
const SH = (name, t0, t1, f) => ({ name, t0, t1, f });
function shots() {
  const ls = (i) => L(i).start, u0 = 0.15;
  const me = (t, y) => { const w = walk(t); return M(w.x, 7.4 + y, w.z); };
  return [
    SH('street', () => -1, () => ls(1) - u0, (u) => ({ pos: lp3(v3(172, 7.5, 3), v3(128, 6, 3), easeOut(u)), look: v3(20, 2.4, -4), fov: 62 })),
    SH('porch', () => ls(1) - u0, () => ls(2) - u0, (u) => ({ pos: lp3(H(2.1, 3.6, 19), H(2.1, 3.1, 17.4), u), look: H(2.1, 2.5, 7), fov: 62 })),
    SH('boxclose', () => ls(2) - u0, () => ls(3) - u0, (u) => ({ pos: lp3(H(2.1, 2.2, 13.6), H(2.1, 1.7, 11.4), easeInOut(u)), look: H(2.1, 1.05, 8.3), fov: 52 })),
    SH('rule', () => ls(3) - u0, () => ls(4) - u0, (u) => ({ pos: lp3(v3(HX + 14, 8.4, -11.5), v3(HX + 14, 4.9, -12.0), easeInOut(u)), look: v3(HX + 14, 0.8, -13.2), fov: 50 })),
    SH('room', () => ls(4) - u0, () => EV.knock3 + 0.45, (u) => ({ pos: lp3(H(3.2, 4.2, 6.1), H(3.2, 4.2, 5.2), u), look: H(3.2, 3.3, -1.8), fov: 66 })),
    SH('door', () => EV.knock3 + 0.45, () => ls(6) - u0, (u) => ({ pos: lp3(H(2.1, 1.1, 15.5), H(2.1, 1.6, 13.8), u), look: H(2.1, 2.8, 6), fov: 66 })),
    SH('label', () => ls(6) - u0, () => ls(7) - u0, (u) => ({ pos: lp3(H(2.4, 1.6, 12.2), H(2.2, 1.3, 11.3), easeInOut(u)), look: H(2.1, 1.05, 9.1), fov: 42 })),
    SH('open', () => ls(7) - u0, () => EV.fold + 0.1, (u) => ({ pos: lp3(H(-3.6, 5.6, 1.6), H(-3.0, 5.5, 1.0), u), look: H(3.2, 4.1, -0.5), fov: 56 })),
    SH('reveal', () => EV.fold + 0.1, () => ls(9) - u0, (u) => ({ pos: lp3(T(1.6, 3.4, 3.6), T(0.9, 2.3, 2.3), easeInOut(u)), look: T(0, 0.6, 0), fov: 48 })),
    SH('orbit', () => ls(9) - u0, () => ls(10) - u0, (u) => { const a = lerp(0.7, -0.5, u); return { pos: T(Math.sin(a) * 1.9, 2.4, Math.cos(a) * 1.9), look: T(0, 0.75, -0.1), fov: 46 }; }),
    SH('furniture', () => ls(10) - u0, () => ls(11) - u0, (u) => ({ pos: lp3(M(3.4, 14.4, 6), M(2.4, 13.6, 5.4), u), look: M(-4.6, 7.8, 0.6), fov: 62 })),
    SH('lean', () => ls(11) - u0, () => ls(12) - u0, (u) => ({ pos: lp3(H(3.2, 4.4, 6.1), H(3.2, 4.5, 5.2), u), look: H(3.2, 3.6, -1.2), fov: 62 })),
    SH('tinydown', () => ls(12) - u0, () => ls(13) - u0, (u) => ({ pos: lp3(T(-0.1, 2.2, 1.5), T(-0.1, 1.75, 1.05), easeInOut(u)), look: T(-0.12, 0.92, -0.3), fov: 44 })),
    SH('moving', () => ls(13) - u0, () => ls(14) + 1.5, (u, t) => ({ pos: lp3(M(-3.2, 13.8, 6.2), M(-2.6, 12.8, 5.6), u), look: me(t, 2.6), fov: 60 })),
    SH('watch', () => ls(14) + 1.5, () => ls(15) - u0, (u) => ({ pos: H(6.6, 5.6, 4.2), look: H(3.2, 3.6, -0.4), fov: 60 })),
    SH('upface', () => ls(15) - u0, () => EV.lookup + 0.85, (u, t) => ({ pos: lp3(M(0.1, 19, 0.2), M(0.15, 17.2, 1.2), easeInOut(u)), look: me(t, 3.6), fov: 50 })),
    SH('uppov', () => EV.lookup + 0.85, () => ls(16) - u0, (u) => ({ pos: M(0.2, 11.6, 3.8), look: M(0, 38, -16), fov: 72 })),
    SH('shakeT', () => ls(16) - u0, () => ls(17) - u0, (u) => ({ pos: lp3(T(2.6, 2.8, 3.1), T(1.9, 2.4, 2.6), u), look: T(-0.2, 0.9, -0.6), fov: 62 })),
    SH('handT', () => ls(17) - u0, () => ls(18) - u0, (u) => ({ pos: lp3(T(-1.8, 2.6, 2.7), T(-1.5, 2.3, 2.4), u), look: T(0.4, 1.0, 0.5), fov: 58 })),
    SH('scream', () => ls(18) - u0, () => ls(19) - 0.05, (u) => ({ pos: lp3(H(2.0, 4.5, 3.4), H(2.2, 4.6, 2.5), easeOut(u * 1.6)), look: H(3.2, 4.3, -2.6), fov: 62 })),
    SH('hand1', () => ls(19) - 0.05, () => ls(19) + 1.15, (u) => ({ pos: lp3(H(-0.8, 5.0, 2.0), H(-0.5, 5.0, 1.6), u), look: H(2.4, 4.8, -2.2), fov: 50 })),
    SH('hand2', () => ls(19) + 1.15, () => ls(20) - u0, (u) => ({ pos: lp3(H(-5.5, 5.2, -0.2), H(-5.1, 5.15, -0.2), u), look: H(3.4, 4.5, 0.2), fov: 72 })),
    SH('ceiling', () => ls(20) - u0, () => ls(21) - u0, (u) => ({ pos: lp3(H(2.2, 5.0, 2.6), H(2.3, 4.9, 2.2), u), look: H(3.2, 5.3, -2.7), fov: 64 })),
    SH('frontdoor', () => ls(21) - u0, () => ls(22) - u0, (u) => ({ pos: lp3(H(-2.5, 4.8, 0.5), H(-2.2, 4.6, 1.0), u), look: H(2.1, 3.2, 6.6), fov: 62 })),
    SH('above', () => ls(22) - u0, () => ls(23) - u0, (u) => ({ pos: lp3(H(-30, 34, 54), H(-22, 26, 46), u), look: H(0, 12, 0), fov: 62 })),
    SH('sky', () => ls(23) - u0, () => 999, (u, t) => { const k = smooth(EV.flaps - 0.2, EV.flaps + 2.4, t), a = lerp(0.2, 0.72, k); return { pos: lp3(H(2.1, 1.5, 33.5), H(2.1, 1.1, 36), smooth(ls(23), ctx.dur, t)), look: H(2.1, 1.3 + Math.sin(a) * 100, 33.5 - Math.cos(a) * 100), fov: lerp(70, 88, k) }; }),
  ];
}

// ---------- the frame ----------
function renderAt(t) {
  const sh = shotAt(W.shots, t);
  const n = sh.name;
  const inModel = ['furniture', 'moving', 'upface', 'uppov'].includes(n);
  const inRoom = ['room', 'open', 'reveal', 'orbit', 'lean', 'tinydown', 'watch', 'shakeT', 'handT', 'scream', 'hand1', 'hand2', 'ceiling', 'frontdoor'].includes(n);
  const k = smooth(EV.flaps - 0.3, EV.flaps + 3.6, t);
  applyEnv(ctx, inModel ? MAC : inRoom ? INT : t > EV.flaps ? mixP(EXT, OPEN, k) : EXT);

  // packages along the street: a wave at midnight
  const pop = (t0) => easeOut(clamp((t - t0) / 0.28));
  W.boxes.forEach((b, i) => { const s = pop(i * 0.1); b.g.visible = s > 0 && t < L(1).start; b.g.scale.setScalar(Math.max(0.001, s * 1.35)); });
  // the hero box
  const porchT = L(1).start + 0.75, ps = pop(porchT);
  W.porchBox.g.visible = t >= porchT && t < L(7).start - 0.15;
  W.porchBox.g.scale.setScalar(Math.max(0.001, 0.78 * ps));
  W.rule.g.visible = n === 'rule';

  // the front door swings in for the box, shut again by the end
  const dOpen = smooth(L(5).start - 0.35, L(5).start + 0.35, t) * (1 - smooth(L(7).start - 0.3, L(7).start, t));
  const rd = W.house.door, a = dOpen * 1.45;
  rd.rotation.y = a; rd.position.x = 0.6 + 1.5 * Math.cos(a); rd.position.z = 6.65 - 1.5 * Math.sin(a);

  // the box on the table
  const onTable = t >= L(7).start - 0.2;
  W.tableBox.g.visible = onTable;
  const lidU = smooth(EV.lid, EV.lid + 1.2, t);
  W.tableBox.lid.position.set(lerp(0, 3.0, smooth(0.45, 1, lidU)), lerp(1.7, 2.3, Math.sin(Math.min(1, lidU) * Math.PI)) * (1 - 0.1 * smooth(0.6, 1, lidU)), 0);
  W.tableBox.lid.visible = t < EV.fold + 0.2;
  const fold = smooth(EV.fold, EV.fold + 1.1, t);
  W.tableBox.open(fold * 1.25);
  W.holder.visible = t >= EV.fold;
  W.modelGlow.material.opacity = 0.5 * (smooth(EV.fold, EV.fold + 0.4, t) - smooth(EV.fold + 1.2, EV.fold + 2.4, t));

  // the walk: bedroom floor, to the window, turn, look up (one path for both views)
  const walkA = L(13).start + 0.1, walkB = L(14).end + 0.1, fy = 7.4;
  const { x: px, z: pz } = walk(t);
  const walking = t > walkA && t < walkB - 0.1;
  const turned = smooth(EV.lookup - 0.45, EV.lookup + 0.1, t);
  const place = (c) => {
    pose(c, walking ? 'walk' : (t > EV.lookup ? 'lookUp' : 'idle'), t, { amt: lerp(0, 0.75, smooth(EV.lookup - 0.1, EV.lookup + 0.4, t)) });
    c.root.rotation.y = Math.atan2(1.4, 5.8) * (1 - turned) + Math.PI * turned;
  };
  W.tiny.root.position.set(px, fy, pz); W.tiny.root.visible = t >= L(11).start; place(W.tiny);
  W.me.root.position.copy(M(px, fy, pz)); W.me.root.visible = inModel && n !== 'furniture' && n !== 'uppov'; place(W.me);

  // shaking
  const sh1 = smooth(EV.shake, EV.shake + 0.3, t) * (1 - smooth(L(19).start, L(19).start + 1, t));
  const jit = (s) => noise1(t * 31 + s) * 0.022 * sh1;
  W.holder.position.copy(T(0, 0.06, -0.15)).add(v3(jit(1), jit(2) * 0.4, jit(3)));
  W.macro.group.position.set(MX + jit(4) * 8, jit(5) * 3, MZ + jit(6) * 8);

  // the giant Emily, as seen from inside the model; her arm is someone else's
  W.giant.root.visible = inModel;
  W.giant.root.position.copy(M(0, -4, -20)); W.giant.root.rotation.y = 0;
  pose(W.giant, 'lean', t, { amt: 0.42 }); W.giant.neck.rotation.x = 0.5;
  // the arm: her size, her sleeve, not hers
  const armIn = easeOut(smooth(L(17).start, L(17).start + 0.9, t));
  W.armT.root.visible = ['handT', 'scream', 'hand1', 'hand2', 'ceiling'].includes(n);
  if (W.armT.root.visible) reach(W.armT, 0.5, T(0.1, 1.16, lerp(2.4, 0.66, armIn)));

  // Emily
  const E = W.em; E.reset();
  E.root.visible = !inModel && !['street', 'porch', 'boxclose', 'rule', 'label', 'above', 'frontdoor'].includes(n);
  const STAND = H(TABLE.x, 0, -2.0);
  if (n === 'room') {
    E.root.position.copy(STAND); pose(E, 'idle', t);
    const turn = smooth(EV.knock1, EV.knock1 + 0.4, t); E.root.rotation.y = 0; E.neck.rotation.y = -0.55 * turn;
  } else if (n === 'door') {
    const u = smooth(L(5).start - 0.4, L(5).start + 0.5, t);
    E.root.position.copy(H(2.1, 0, lerp(3.6, 5.6, u))); E.root.rotation.y = 0;
    pose(E, u < 1 ? 'walk' : 'idle', t); E.neck.rotation.x = 0.42 * u;
  } else if (n === 'open') {
    E.root.position.copy(STAND); E.root.rotation.y = 0; pose(E, 'handsToWindow', t, { amt: -0.45 });
    E.arms[0].rotation.x = -1.1 - 0.15 * Math.sin(lidU * 3.1); E.arms[1].rotation.x = -1.1 - 0.15 * Math.sin(lidU * 3.1);
  } else if (['reveal', 'orbit', 'tinydown'].includes(n)) {
    E.root.position.copy(STAND); E.root.rotation.y = 0; pose(E, 'lean', t, { amt: 0.3 });
  } else if (n === 'lean' || n === 'watch') {
    E.root.position.copy(STAND); E.root.rotation.y = 0; pose(E, 'lean', t, { amt: n === 'lean' ? lerp(0.1, 0.4, smooth(L(11).start, L(12).start, t)) : 0.38 });
  } else if (n === 'shakeT' || n === 'handT') {
    E.root.position.copy(STAND); E.root.rotation.y = 0; pose(E, 'scared', t);
  } else if (n === 'scream') {
    const u = smooth(L(18).start - 0.05, L(18).start + 0.28, t);
    E.root.position.copy(H(TABLE.x, 0, lerp(-2, -2.7, u))); E.root.rotation.y = 0; pose(E, 'scared', t, { amt: 0.3 });
    E.arms[0].rotation.x = lerp(-1.2, -2.5, u) + Math.sin(t * 40) * 0.05; E.arms[1].rotation.x = lerp(-1.2, -2.5, u) + Math.sin(t * 43) * 0.05;
    E.arms[0].rotation.z = 0.25; E.arms[1].rotation.z = -0.25; E.torso.rotation.x = -0.24;
    E.root.position.y = Math.sin(clamp((t - L(18).start) / 0.3) * Math.PI) * 0.35;
  } else if (n === 'hand1' || n === 'hand2') {
    E.root.position.copy(H(TABLE.x, 0, -2.7)); E.root.rotation.y = 0; pose(E, 'still', t); E.neck.rotation.x = 0.2; E.neck.rotation.y = -0.34;
    E.arms[0].rotation.x = -2.6; E.arms[0].rotation.z = 0.1;
  } else if (n === 'ceiling') {
    E.root.position.copy(H(TABLE.x, 0, -2.7)); E.root.rotation.y = 0; pose(E, 'lookUp', t, { amt: 0.35 });
  } else if (n === 'sky') {
    E.root.position.copy(H(2.1, 0.3, 27)); E.root.rotation.y = Math.PI; pose(E, 'lookUp', t, { amt: 0.75 });
    E.arms[0].rotation.z = -0.22; E.arms[1].rotation.z = 0.22;
  }

  // three knocks from above: dust from the ceiling
  const thud = Math.max(...[EV.top1, EV.top2, EV.top3].map((q) => (t >= q ? Math.exp(-(t - q) * 7) : 0)));
  const dustOn = n === 'ceiling' || n === 'frontdoor';
  W.dust.forEach((d) => {
    const f = ((t * 0.34 + d.ph) % 1);
    d.s.visible = dustOn && t > EV.top1;
    d.s.position.copy(H(TABLE.x + d.x, 7 - f * 6.4, d.z));
    d.s.material.opacity = 0.65 * (1 - f);
  });
  W.house.warmDown.intensity = 42 * (1 - thud * 0.55);

  // the sky: the top pair of flaps, then the pair under it
  const skyOn = n === 'sky';
  const fa = smooth(EV.flaps, EV.flaps + 3.0, t), fb = smooth(EV.flaps + 0.9, EV.flaps + 3.9, t);
  W.flaps.forEach((f, i) => {
    f.p.visible = skyOn;
    const ang = i < 2 ? fa * 1.32 : fb * 1.5;
    if (f.ax === 'x') f.p.rotation.z = -f.sg * ang; else f.p.rotation.x = f.sg * ang;
  });
  W.faceLight.intensity = skyOn ? 2.2 : 0;
  W.walls.visible = skyOn; W.beyond.visible = skyOn; W.top.root.visible = skyOn;
  W.tape.visible = skyOn && fa < 0.34; W.tape.material.opacity = 0.9 * smooth(EV.seam, EV.flaps, t);
  pose(W.top, 'still', t);
  // her head over the opening, tipped to look down at the town
  const tip = 1.06 + 0.05 * (1 - smooth(EV.flaps + 1, EV.flaps + 5, t)), hd = v3(HX, 1120 + 160 * (1 - smooth(EV.flaps + 1, EV.flaps + 5, t)), -600);
  W.top.root.rotation.set(tip, 0, 0);
  W.top.root.position.copy(hd).sub(v3(0, Math.cos(tip), Math.sin(tip)).multiplyScalar(4.4 * TOPS));

  const shake = n === 'shakeT' ? 0.9 * sh1 : n === 'handT' ? 0.3 : n === 'scream' ? 0.5 : (n === 'ceiling' || n === 'above' || n === 'frontdoor') ? thud * 1.4 : (n === 'sky' ? 0.3 - 0.16 * fb : 0);
  frame(ctx, t, sh, { shake, shadows: !inRoom });
  return n;
}

export async function setup() {
  ctx = await initStage('ep17'); L = ctx.L; EV = events();
  await build();
  W.shots = shots();
  const api = expose(ctx, renderAt, ctx.dur - 1.0, EV);
  const thumb = window.__thumb;   // the text goes in the night between her face and the street, not across her eyes
  window.__thumb = (x) => { thumb(x); ctx.cap.style.top = '905px'; ctx.cap.style.fontSize = '122px'; ctx.cap.style.left = '20px'; ctx.cap.style.right = '20px'; };
  return api;
}
