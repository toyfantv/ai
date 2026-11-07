// Check page for the pro look, the detail kit and the atmosphere kit: three sets, one per second range.
//   node render.js stills lookdemo 0.5 0.5 1.5 2.5 3.5    (RENDER_LOOK=classic for the before)
import * as THREE from 'three';
import { v3 } from '../engine/core.js';
import { initStage, applyEnv, frame, expose, DAY, DUSK, NIGHT, P } from '../engine/stage.js';
import { Batch, surf, paint, sign, crate, barrel, lamp, building, skyline, crowd } from '../engine/kit.js';
import { dust, sparkles, shaft, flame, clouds, atmos } from '../engine/atmos.js';
import { makeCharacter } from '../engine/character.js';
import { CAST } from '../engine/cast.js';

export async function setup() {
  const ctx = await initStage('lookdemo', { look: 'pro' });
  const { scene } = ctx;
  await document.fonts.load('900 100px ITTInter');
  // set 1: a street
  const street = new THREE.Group(); scene.add(street);
  const sb = new Batch();
  sb.box(surf('concrete', '#8f9298'), 240, 1, 240, 0, -0.5, 0, { r: 0.02 });
  sb.box(paint('#3e4148', { roughness: 0.92 }), 22, 0.1, 240, 0, 0.06, 0, { r: 0.02 });
  for (let z = -110; z < 110; z += 14) sb.box(paint('#e8e2c8'), 0.5, 0.05, 6, 0, 0.13, z, { r: 0.02 });
  for (const s of [-1, 1]) sb.box(surf('tile', '#b9b6ae'), 12, 0.6, 240, s * 17, 0.3, 0, { r: 0.08 });
  sb.done(street);
  const defs = [
    { style: 'brick', wall: '#b05b42', floors: 3, name: 'BAKERY', shutters: '#2f5d50', signBg: '#2f5d50' },
    { style: 'stucco', wall: '#e6c79c', floors: 2, roof: 'gable', shutters: '#3d5a80', w: 26 },
    { style: 'brick', wall: '#6f7f96', floors: 4, name: 'HOTEL', trim: '#f4efe6', signBg: '#7d2e2e' },
    { style: 'stucco', wall: '#d98f6c', floors: 3, name: 'RECORDS', signBg: '#222a40' },
  ];
  defs.forEach((d, i) => for2(i));
  function for2(i) {
    for (const s of [-1, 1]) {
      const b = building({ ...defs[(i + (s > 0 ? 1 : 0)) % 4], seed: i * 2 + s + 5 });
      b.position.set(s * 36, 0, -70 + i * 40); b.rotation.y = -s * Math.PI / 2; street.add(b);
    }
  }
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const l = lamp(); l.position.set(s * 12.5, 0.6, -60 + i * 26); if (s > 0) l.rotation.y = Math.PI; street.add(l); }
  [[-15, 6], [-17, 9], [15, -6]].forEach(([x, z], i) => { const c = crate({ size: 2.2 + i * 0.3 }); c.position.set(x, 0.6, z); c.rotation.y = i; street.add(c); });
  const br = barrel(); br.position.set(-14, 0.6, 2); street.add(br);
  const hero = makeCharacter({ ...CAST[Object.keys(CAST)[0]], position: v3(0, 0, 0) });
  street.add(hero.root);
  street.add(skyline({ spread: 900, gap: 150, count: 120 }));
  const air1 = atmos(clouds(scene, { y: 220, count: 14 }), dust(street, { size: 90, height: 30, centre: v3(0, 14, 10), count: 700, amount: 0.35 }));
  // set 2: a gold hall
  const hall = new THREE.Group(); hall.position.x = 3000; scene.add(hall);
  const hb = new Batch(), gold = paint('#e0ac3c', { metalness: 0.55, roughness: 0.38 }), sandstone = surf('brick', '#d7a65f');
  hb.box(surf('tile', '#e9c98a'), 60, 1, 120, 0, -0.5, 0, { r: 0.02 });
  hb.box(paint('#b83a32', { roughness: 0.85 }), 9, 0.14, 120, 0, 0.08, 0, { r: 0.04 });
  for (const s of [-1, 1]) hb.box(sandstone, 2, 40, 120, s * 30, 20, 0, { r: 0.1 });
  hb.box(sandstone, 60, 40, 2, 0, 20, -60, { r: 0.1 }); hb.box(paint('#6d4a22', { roughness: 0.8 }), 60, 1, 120, 0, 40.5, 0, { r: 0.05 });
  const torches = [];
  for (let z = -48; z <= 40; z += 22) for (const s of [-1, 1]) {
    hb.cyl(sandstone, 2.1, 2.5, 30, s * 20, 15, z, { seg: 20 }); hb.cyl(gold, 3, 2.3, 1.6, s * 20, 30.6, z, { seg: 20 }); hb.cyl(gold, 2.7, 2.7, 0.8, s * 20, 0.4, z, { seg: 20 });
    hb.cyl(gold, 0.7, 0.32, 1.2, s * 13, 7, z, { seg: 12 }); hb.cyl(paint('#3a2a18'), 0.2, 0.26, 6.4, s * 13, 3.2, z);
    torches.push(flame(hall, { pos: v3(s * 13, 7.5, z), size: 1.2, seed: z + s, intensity: z > 10 ? 40 : 0 }));
  }
  hb.done(hall);
  const s2 = sign('THE LAST ROOM\nHAS BEEN FOUND', { w: 18, h: 6, bg: '#3a2a18', fg: '#f4d68a', edge: '#d9a83a' }); s2.position.set(0, 22, -58.8); hall.add(s2);
  const air2 = atmos(dust(hall, { size: 56, height: 36, centre: v3(0, 18, 0), count: 900, color: '#ffd98a', amount: 0.6 }), sparkles(hall, { centre: v3(0, 6, -40), size: 18, height: 10 }), ...torches);
  shaft(scene, { parent: hall, from: v3(0, 40, -30), to: v3(0, 0, -6), top: 3, bottom: 9, color: '#ffdf9a', amount: 0.14 });
  // set 3: a square and its crowd
  const sq = new THREE.Group(); sq.position.x = -3000; scene.add(sq);
  const qb = new Batch(); qb.box(surf('sand', '#b99a6e'), 500, 1, 500, 0, -0.5, 0, { r: 0.02 }); qb.done(sq);
  const palace = building({ style: 'stucco', wall: '#f0e6d0', trim: '#d9a83a', floors: 3, w: 40, d: 30, name: 'PALACE', signBg: '#7d2e2e', lit: 0.6, seed: 4 }); sq.add(palace);
  const folks = crowd({ count: 700, layout: 'ring', radius: 42, depth: 30, look: v3(0, 0, 0), cheer: 0.3, parent: sq });
  sq.add(skyline({ spread: 1000, gap: 170, count: 90, colors: ['#8e6f7c', '#a77a6e', '#6e6a8c'] }));
  const air3 = atmos(folks, clouds(scene, { y: 240, count: 8, color: '#ffc9b0' }));
  const GOLD = P({ ...DAY, top: '#c48a2e', horizon: '#e0b060', haze: '#b98a40', hemiSky: '#ffd78a', hemiGround: '#a8702a', sunI: 0.9, sunColor: '#ffdca0', fogNear: 60, fogFar: 240, bloom: 0.3, stars: 0, sunDisc: 0 });
  return expose(ctx, (t) => {
    if (t < 2) {
      street.visible = true; hall.visible = sq.visible = false; air1.update(t);
      const walk = (t % 1) * 22; hero.root.position.set(4, 0.1, 20 - walk); hero.root.rotation.y = Math.PI;
      if (hero.update) hero.update({ t, walk: 1 });
      applyEnv(ctx, { ...DAY, fogNear: 180, fogFar: 640 });
      frame(ctx, t, t < 1 ? { name: 'street', pos: v3(-9, 7, 34), look: v3(6, 8, -6), fov: 62 } : { name: 'street2', pos: v3(-13, 3.2, 8), look: v3(-30, 8, 4), fov: 58 }, { steady: true });
    } else if (t < 3) {
      hall.visible = true; street.visible = sq.visible = false; air2.update(t);
      applyEnv(ctx, GOLD);
      frame(ctx, t, { name: 'hall', pos: v3(3000 + 1, 6.5, 44), look: v3(3000, 12, -40), fov: 58 }, { steady: true });
    } else {
      sq.visible = true; street.visible = hall.visible = false; air3.update(t);
      applyEnv(ctx, { ...DUSK, fogNear: 150, fogFar: 760 });
      frame(ctx, t, { name: 'square', pos: v3(-3000 + 34, 46, 96), look: v3(-3000, 8, 0), fov: 58 }, { steady: true });
    }
  }, 0.5);
}
