// The renderer's own models. Episodes reach them through engine/library.js: model('package_box').
// Each builder takes one options object and returns the model; the catalogue is web/assets/models/index.json.
import { building, skyline, crowd, crate, barrel, lamp, sign, Batch, surf, paint } from './kit.js';
import { treeShape, treeSet, heroOak } from './forest.js';
import { makeIsland, palms, sailboat, galleon, hut, stall, dock, chest, katana, fruit, city, greatTemple } from './isles.js';
import * as THREE from 'three';
import { laptop as cursedLaptop, bedroom as recordingBedroom, hotelHall as recordingHall, tapeHead } from './cursedtape.js';
import { v3, rng, mat, box, wallRects, lerp } from './core.js';
import { makeHouse, makeTree, mergeGroup, buildHeroHouse, buildTown } from './town.js';
import { makeLeg, footAt, makeEye, canvasTex, glowSprite } from './props.js';
import { secCam, fridge, diningChair, diningTable, bed, sofa, plant, pcDesk, selectionBox, modernHouse } from './home.js';
import { doorLeaf, plate, exitSign, flashlight, ceilingTiles, rubble, hotelTower } from './hotel.js';
import { gown, dressForm, starPaddle } from './runway.js';
import { goldenDragon, goldenKey, goldenEgg } from './pets.js';
import { cottage, mailbox, framedPhoto } from './pastel.js';
import { campfire, tent, logSeat, woodPile, axeStump, lantern, cookPot, bedroll, supplyCrate, pines, exitGate, beast, snow } from './camp.js';
import { obbyPlatform, laserCross, controlChair } from './obby.js';
import { ornateFrame, printMat, loosePrint, invitation, chandelier, sconce, bigChair, banquetTable, gramophone, grandClock, curtainWindow, panelDoor, bareTrees, mansion, guest } from './mansion.js';
import { stormIsland, courtyard, clockTower, postClock, brickWall, crater, stormSea, rain as stormRain, timeCrack, cavern } from './ruins.js';
import { screenMat, flatTV, seatBanks, mallRing, jumbotron, countdownDraw, rollGate, glassShatter, hunterHelmet, metalPipe, tvHouse, studioSet, shopSign, shopWindowMat } from './gameshow.js';
import { trainingRifle, soldierGear, syncRanks, muzzleFlashes, tracers, eventParticles, bulletHoles, smokeHaze, jerseyBarrier, steelDoor, securityCam, wallClock, trainingHall, controlRoom, feedWall, industrialDistrict, bloodFX } from './tactical.js';
import { magicArena, arenaGround, voidRocks, fallingRocks, fireWall, energyOrb, runeShield, shardBurst, shockwave, sigil, beam, decal, arcBolt, fireStream, driftParticles, shadowCrowd, teleportFx, cloak } from './arena.js';
import { blackSword, whiteBlade, armorSuit, swordField } from './blades.js';
import { buildTower as infiniteTower, loosePlatform as towerPlatform, doorWall as towerDoorWall, ledge as towerLedge, towerField, chalkStick, paintKit } from './infinitetower.js';
import { hospitalBed, wardDoor, fluorPanel, crtTV, ivPole, cabinet, paSpeaker, roomPlate, bedChart, nurse, wardBeds, hospitalBlock, noticeSign } from './hospital.js';
import { voiceTunnel, drips as tunnelDrips, hillside as tunnelHillside, floodTripod, cautionTape, tapePost, rescueRadio, rescueTruck, campTable, wallFaces } from './tunnel.js';
import { puppet, socketHead, stairHall, schoolCorridor, satchel, flashlightProp, strawRope, ofuda } from './folklore.js';
import { cubeSeed, cubeStairs, gardenPlot, seedStall, wateringCan, wheelbarrow, scarecrow, floatingIsland, glassField, nameTree, bloomField } from './garden.js';
import { ironBoots, paperSlippers, diverBelt, mitt as wtMitt, looseBoots, lostSlipper, rope as wtRope, fireLadder, hallClock, foundersHall, glassPeacock, auntSet, kitchenSet, cerealBox, courtroom, plumbwick, brookYard } from './lighterlies.js';
import { greenhouse as sgGreenhouse, breadCart, gardenBench, cakeTable, partyHat as sgPartyHat, sickBed, quilt, ruthRoom, flowerMesh, larkspur } from './sorrygarden.js';
import { mallHall, polishedFloor, directoryKiosk, clawMachine, automaticDoor, wetSign, mop as mallMop, bucket as mopBucket, shoppingBag, phoneProp, blockWall, exteriorFacade, paHorn } from './mall.js';
import { ferrisWheel, carousel, ticketBooth, parkArch, exitGate as parkExitGate, chainFence, midwayStall, parkLamp, paSpeakers as parkPaSpeakers, broom, controlLever, ticketStub, bareStrings, popcornTub, balloon as nameBalloon, teaCups, swingRide, coaster as parkCoaster, blueCreature } from './amusement.js';

// ---------- Episode 17 ----------
// The black package: four walls that fold out (open(angle)), a lid, a RETURN ADDRESS label.
export function makeBox(parent) {
  const g = new THREE.Group(); if (parent) parent.add(g);
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
export function cutaway(house) {
  for (const c of [...house.group.children]) {
    if (c.isLight) { c.intensity = 0; c.visible = false; continue; }
    const p = c.position, gp = c.geometry && c.geometry.parameters;
    if (!gp) continue;
    if (gp.radialSegments || (p.y > 13.6 && gp.height < 1)) house.group.remove(c);
    else if (p.z > 11 && p.y < 1) house.group.remove(c);   // hedge
  }
  return house;
}

// The sky as a box: two pairs of flaps with the night printed inside, walls, a lit room beyond. C is the centre, A the half size.
export function cardboardSky(scene, C, A) {
  const W = {};
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
  return W;
}

// ---------- copied from finished episodes (they keep their own code, so their renders can't change) ----------
let FACE = null;
const clockFace = () => FACE || (FACE = canvasTex(512, 512, (c, w, h) => {
  c.fillStyle = '#fff8e8'; c.beginPath(); c.arc(256, 256, 248, 0, 7); c.fill();
  c.strokeStyle = '#3a2a1a'; c.lineWidth = 10; c.stroke();
  c.fillStyle = '#3a2a1a'; c.font = '700 54px ITTInter, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; c.fillText(R[i], 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); }
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; c.fillRect(256 + Math.cos(a) * 228 - 2, 256 + Math.sin(a) * 228 - 2, 4, 4); }
}));

function makeClock(r, glow = true) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ map: clockFace(), toneMapped: false })); g.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 8, 40), new THREE.MeshStandardMaterial({ color: '#d8a83a', metalness: 0.7, roughness: 0.3, emissive: '#5a3a00', emissiveIntensity: 0.5 })); g.add(rim);
  const hm = new THREE.MeshBasicMaterial({ color: '#1a1410' });
  const hour = new THREE.Group(), min = new THREE.Group(); g.add(hour); g.add(min);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(r * 0.08, r * 0.5, 0.02), hm); hb.position.set(0, r * 0.22, 0.03); hour.add(hb);
  const mb = new THREE.Mesh(new THREE.BoxGeometry(r * 0.05, r * 0.78, 0.02), hm); mb.position.set(0, r * 0.36, 0.05); min.add(mb);
  if (glow) { const gl = glowSprite('#ffd27a', r * 4, 0.35); gl.position.z = -0.1; g.add(gl); }
  return { g, setTime(minutes) { min.rotation.z = -(minutes / 60) * Math.PI * 2; hour.rotation.z = -(minutes / 720) * Math.PI * 2; } };
}

function makeCar(color) {
  const g = new THREE.Group();
  box(5.2, 1.4, 2.6, mat(color), 0, 1.1, 0, g); box(3, 1.2, 2.3, mat(color), -0.3, 2.3, 0, g);
  box(2.9, 1.0, 2.35, new THREE.MeshStandardMaterial({ color: '#9fd2ff', roughness: 0.1 }), -0.3, 2.3, 0, g, false).scale.set(1.02, 0.85, 1.02);
  for (const [x, z] of [[-1.7, 1.2], [1.7, 1.2], [-1.7, -1.2], [1.7, -1.2]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 14), mat('#1a1a1a')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.6, z); g.add(w); }
  return g;
}

function makeBird(r) {
  const g = new THREE.Group(); const m = mat(['#3a3a4a', '#5a4a3a', '#ffffff'][Math.floor(r() * 3)]);
  box(0.8, 0.4, 0.4, m, 0, 0, 0, g, false); box(0.3, 0.3, 0.3, m, 0.5, 0.15, 0, g, false);
  const w1 = new THREE.Group(), w2 = new THREE.Group(); g.add(w1); g.add(w2);
  box(0.4, 0.06, 1.0, m, 0, 0, 0.5, w1, false); box(0.4, 0.06, 1.0, m, 0, 0, -0.5, w2, false);
  return { g, w1, w2 };
}

function makeTrainCar(len) {
  const g = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: '#d8dde6', metalness: 0.85, roughness: 0.25 });
  box(len, 7, 6, silver, 0, 4.5, 0, g); box(len, 0.6, 6.2, mat('#7a8090'), 0, 1.0, 0, g);
  const win = new THREE.MeshBasicMaterial({ color: '#ffe6a8' });
  for (let x = -len / 2 + 3; x < len / 2 - 2; x += 3.2) for (const s of [-1, 1]) box(2.2, 2.0, 0.1, win, x, 5.4, s * 3.06, g, false);
  for (const s of [-1, 1]) box(len, 0.25, 0.1, mat('#6a8aff'), 0, 3.6, s * 3.06, g, false);
  for (const x of [-len / 2 + 3, len / 2 - 3]) for (const z of [-2, 2]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 16), mat('#2a2a30')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.9, z); g.add(w); }
  return g;
}

let STAR_TEX = null;
const starTex = () => STAR_TEX || (STAR_TEX = canvasTex(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(0.3, 'rgba(255,210,90,0.55)'); g.addColorStop(1, 'rgba(255,190,60,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#fffbe0'; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 12 : 30; c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
  c.closePath(); c.fill();
}));

function makeStar(size, color = '#ffe7a0') {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size); return s;
}

function makeJar() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 20), new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.35, roughness: 0.05 }));
  g.add(glass);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.2, 20), mat('#c09040', { caustic: false })); lid.position.y = 0.72; g.add(lid);
  for (let i = 0; i < 5; i++) { const s = makeStar(0.55); s.position.set((Math.random() - 0.5) * 0.5, -0.4 + i * 0.18, (Math.random() - 0.5) * 0.5); g.add(s); }
  g.add(glowSprite('#ffd060', 3.2, 0.6));
  return g;
}

function faceTex(kind) {
  return canvasTex(256, 256, (c, w, h) => {
    const ink = '#3a2a4a'; c.lineCap = 'round';
    const eye = (x) => {
      if (kind === 'sleep') { c.strokeStyle = ink; c.lineWidth = 9; c.beginPath(); c.arc(x, 120, 16, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
      else if (kind === 'open' || kind === 'mouth') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, 112, 26, 32, 0, 0, 7); c.fill(); c.fillStyle = kind === 'mouth' ? '#ff2a5a' : ink; c.beginPath(); c.arc(x, 116, kind === 'mouth' ? 9 : 15, 0, 7); c.fill(); }
      else { c.fillStyle = ink; c.beginPath(); c.ellipse(x, 116, 12, 17, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 4, 110, 4, 0, 7); c.fill(); }
    };
    eye(88); eye(168);
    c.fillStyle = 'rgba(255,120,160,0.45)'; c.beginPath(); c.ellipse(60, 150, 18, 10, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(196, 150, 18, 10, 0, 0, 7); c.fill();
    if (kind === 'eat') { c.fillStyle = ink; c.beginPath(); c.ellipse(128, 168, 22, 26, 0, 0, 7); c.fill(); }
    else if (kind === 'mouth') { c.fillStyle = '#1a0610'; c.beginPath(); c.ellipse(128, 190, 80, 50, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(66 + i * 18, 150); c.lineTo(75 + i * 18, 168); c.lineTo(84 + i * 18, 150); c.fill(); } }
    else if (kind !== 'sleep') { c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.arc(128, 150, 16, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
    else { c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.arc(128, 160, 8, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
  });
}

let FACES = null;
const cloudFaces = () => FACES || (FACES = { sleep: faceTex('sleep'), happy: faceTex('happy'), eat: faceTex('eat'), open: faceTex('open'), mouth: faceTex('mouth') });
function makeCloud(size, color, seed) {
  const FACES = cloudFaces();
  const r = rng(seed); const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, emissive: color, emissiveIntensity: 0.18, fog: true });
  const geo = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(geo, m); const a = (i / 9) * Math.PI * 2;
    s.position.set(Math.cos(a) * 1.1 * (0.6 + r() * 0.5), (r() - 0.3) * 0.6 + (i % 3 === 0 ? 0.5 : 0), Math.sin(a) * 0.5 * r());
    s.scale.setScalar(0.75 + r() * 0.45); s.castShadow = true; g.add(s);
  }
  const core = new THREE.Mesh(geo, m); core.scale.set(1.4, 1.1, 1.0); g.add(core);
  const face = new THREE.Sprite(new THREE.SpriteMaterial({ map: FACES.happy, transparent: true, toneMapped: false }));
  face.scale.set(1.5, 1.5, 1); face.position.set(0, 0.1, 1.25); g.add(face);
  g.scale.setScalar(size);
  return { g, face, m, setFace(k) { face.material.map = FACES[k]; } };
}

function makeWalkerHouse(r, idx = 0) {
  const legMat = mat('#2b2233', { roughness: 0.5 });
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const tmp = new THREE.Group(); makeHouse(tmp, 0, 0, 0, r, r() > 0.5 ? 2 : 1);
  const hg = new THREE.Group(); mergeGroup(tmp, hg); hg.position.y = 0; body.add(hg);
  const legs = []; const hips = [];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    legs.push(makeLeg(root, 9.5, 13, 0.5, legMat)); hips.push({ local: v3(s * 6.6, 0.4, -4.5 + k * 3), s, k });
  }
  return { root, body, legs, hips, idx };
}

function updateWalker(wk, pos, yaw, dist, bodyH, stride = 6, lift = 3, reach = 9, folded = 0) {
  wk.root.position.set(0, 0, 0);
  const fwd = v3(Math.sin(yaw), 0, Math.cos(yaw)); const side = v3(fwd.z, 0, -fwd.x);
  const ph = dist / stride;
  const bob = Math.sin(ph * Math.PI * 4) * 0.35 * (1 - folded);
  const h = lerp(bodyH, 0.6, folded) + bob;
  wk.body.position.set(pos.x, h, pos.z); wk.body.rotation.y = yaw;
  wk.body.updateMatrixWorld();
  wk.hips.forEach((hp, i) => {
    const hip = hp.local.clone().applyMatrix4(wk.body.matrixWorld);
    const out = side.clone().multiplyScalar(hp.s);
    const base = hip.clone().add(out.clone().multiplyScalar(reach * (1 - folded * 0.7))).add(fwd.clone().multiplyScalar((hp.k - 1.5) * 1.2)).setY(0);
    const phase = ph + ((hp.k + (hp.s > 0 ? 1 : 0)) % 2) * 0.5;
    const foot = folded > 0.99 ? hip.clone().add(out.clone().multiplyScalar(1.5)).setY(0.3) : footAt(base, fwd, phase, stride * (1 - folded), lift * (1 - folded));
    wk.legs[i].update(hip, foot, out);
  });
}

function makeStillHouse() {
  const g = new THREE.Group();
  const Wd = 15, D = 12, H = 13, T = 0.4; const c = mat('#d9d2e8'), roofM = mat('#4a3a5a');
  wallRects(Wd, H, [{ x0: -1.8, x1: 1.8, y0: 0, y1: 6 }]).forEach((q) => box(q.x1 - q.x0, q.y1 - q.y0, T, c, (q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, D / 2, g));
  box(Wd, H, T, c, 0, H / 2, -D / 2, g); box(T, H, D, c, -Wd / 2, H / 2, 0, g); box(T, H, D, c, Wd / 2, H / 2, 0, g);
  const dark = new THREE.MeshBasicMaterial({ color: '#030205' });
  box(Wd - 1, H - 0.6, D - 1, dark, 0, H / 2, 0, g, false).material.side = THREE.BackSide;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), roofM); roof.geometry.rotateY(Math.PI / 4); roof.geometry.translate(0, 0.5, 0);
  roof.scale.set((Wd + 2) / Math.SQRT2, 7, (D + 2) / Math.SQRT2); roof.position.y = H; roof.castShadow = true; g.add(roof);
  for (const x of [-5, 5]) box(2.6, 2.6, 0.2, new THREE.MeshBasicMaterial({ color: '#1a1420' }), x, 8.5, D / 2 + 0.15, g, false);
  box(5, 0.4, 3, mat('#cfcfd6'), 0, 0.2, D / 2 + 1.5, g);
  const pivot = new THREE.Group(); pivot.position.set(-1.8, 0, D / 2 + 0.05); g.add(pivot);
  box(3.6, 6, 0.3, mat('#5a1f2a'), 1.8, 3, 0, pivot); box(0.3, 0.3, 0.5, mat('#e8c24a'), 3.2, 3, 0.3, pivot);
  const porch = glowSprite('#ffcf80', 6, 0.9); porch.position.set(2.8, 6.8, D / 2 + 0.6); g.add(porch);
  const eye = makeEye(4.2, '#ffb020'); eye.group.position.set(0, 3.6, D / 2 - 4.6); g.add(eye.group);
  const eyeLight = new THREE.PointLight('#ffb040', 0, 60, 1.5); eyeLight.position.set(0, 4, D / 2 + 3); g.add(eyeLight);
  return { g, pivot, eye, eyeLight, doorPos: v3(0, 3, D / 2) };
}

const inGroup = (fn2) => { const g = new THREE.Group(); fn2(g); return g; };

// ---------- Episode 18 ----------
// The town's stone clock tower, 112 studs to the ball. .clock is the clock: .clock.setTime(minutes)
export function makeClockTower() {
  const g = new THREE.Group();
  const b = new Batch(), stone = surf('brick', '#a8957c'), trim = paint('#e6dcc4', { roughness: 0.55 }), dark = paint('#3b3e47', { metalness: 0.4, roughness: 0.5 }), gold = paint('#d9a83a', { metalness: 0.75, roughness: 0.32 });
  b.box(surf('concrete', '#8a8478'), 34, 2.4, 34, 0, 1.2, 0, { r: 0.2 }); b.box(surf('concrete', '#938d80'), 28, 2.4, 28, 0, 3.6, 0, { r: 0.2 });
  b.box(stone, 21, 62, 21, 0, 35, 0, { r: 0.2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(surf('brick', '#8f7c66'), 3.2, 66, 3.2, sx * 10.2, 37, sz * 10.2, { r: 0.2 });
  for (const y of [16, 30, 42, 66]) b.box(trim, 23.4, 1, 23.4, 0, y, 0, { r: 0.14 });
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const s = Math.sin(ry), c = Math.cos(ry), at = (u, y, o) => [c * u + s * (10.6 + o), y, -s * u + c * (10.6 + o)];
    for (const y of [10, 23, 36]) for (const u of [-4.4, 4.4]) { b.box(trim, 3.2, 6.6, 0.4, ...at(u, y, 0), { ry, r: 0.08 }); b.box(paint('#2a3a4a', { roughness: 0.2, metalness: 0.3 }), 2.4, 5.8, 0.2, ...at(u, y, 0.2), { ry, r: 0.02 }); b.box(trim, 3.8, 0.34, 0.8, ...at(u, y - 3.5, 0.2), { ry, r: 0.06 }); }
    b.box(dark, 18.6, 18.6, 0.6, ...at(0, 54, 0), { ry, r: 0.1 });
    for (const u of [-5, 0, 5]) b.box(trim, 1.8, 7, 0.5, ...at(u, 72, 0), { ry, r: 0.1 });
  }
  b.box(stone, 22, 13, 22, 0, 73, 0, { r: 0.2 }); b.box(trim, 25, 1.2, 25, 0, 80, 0, { r: 0.18 });
  const roof = new THREE.ConeGeometry(17, 26, 4, 1); roof.rotateY(Math.PI / 4);
  b.add(surf('shingle', '#2a5a58'), roof, 0, 93.4, 0); b.cyl(gold, 0.3, 0.5, 6, 0, 108, 0); b.done(g);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 12), gold); ball.position.y = 111; g.add(ball);
  const ck = makeClock(8.4, false); ck.g.position.set(0, 54, 11.0); g.add(ck.g); g.clock = ck;
  return g;
}

// name -> builder. o.parent, when given, receives the model.
const put = (o, m) => { if (o.parent) o.parent.add(m.isObject3D ? m : m.g || m.root); return m; };
export const BUILD = {
  mall_hall: () => mallHall({ floorMat: polishedFloor(), arcade: true }),
  mall_directory: () => directoryKiosk(),
  mall_claw_machine: () => clawMachine(),
  mall_auto_door: () => automaticDoor(),
  mall_wet_sign: () => wetSign(),
  mall_mop: () => mallMop(),
  mall_bucket: () => mopBucket(),
  shopping_bag: () => shoppingBag(),
  phone_445: () => phoneProp(),
  mall_block_wall: () => blockWall(),
  mall_facade: () => exteriorFacade(),
  mall_pa_horn: () => paHorn(),
  ferris_wheel: () => ferrisWheel(),
  carousel_ride: () => carousel(),
  ticket_booth: () => ticketBooth(),
  park_arch: () => parkArch('MERRIWAY PARK'),
  park_exit_gate: () => parkExitGate(),
  chain_fence: () => chainFence(40),
  midway_stall: () => midwayStall('RING TOSS'),
  park_lamp: () => parkLamp(),
  park_pa_speakers: () => parkPaSpeakers(),
  push_broom: () => broom(),
  control_lever: () => controlLever(),
  ticket_stub: () => ticketStub(),
  bare_strings: () => bareStrings(),
  popcorn_tub: () => popcornTub(),
  name_balloon: () => nameBalloon('PIPER'),
  tea_cups: () => teaCups(),
  swing_ride: () => swingRide(),
  park_coaster: () => parkCoaster(),
  blue_creature: () => blueCreature().root,
  // Episode 38 (web/engine/cursedtape.js)
  recording_bedroom: (o) => put(o, recordingBedroom(o.U ?? { value: 0 })),
  cursed_laptop: (o) => put(o, cursedLaptop(o)),
  recording_hotel_hall: (o) => put(o, recordingHall()),
  tape_head: (o) => put(o, tapeHead(o.box ?? new THREE.Box3(new THREE.Vector3(-0.6, -0.6, -0.6), new THREE.Vector3(0.6, 0.6, 0.6)))),
  // Episode 37 (web/engine/folklore.js)
  stair_hall: (o) => put(o, stairHall()),
  school_corridor: (o) => put(o, schoolCorridor()),
  folklore_puppet: (o) => put(o, puppet(o)),
  eyeless_head: (o) => put(o, socketHead(o)),
  child_satchel: (o) => put(o, satchel(o)),
  folklore_flashlight: (o) => put(o, flashlightProp()),
  straw_rope: (o) => put(o, strawRope(o.a, o.b, o)),
  paper_charm: (o) => put(o, ofuda(o.seed ?? 1, o.w, o.h)),
  kit_building: (o) => put(o, building(o)),
  security_cam: (o) => put(o, secCam()),
  voice_tunnel: (o) => put(o, voiceTunnel(o)),   // Episode 39; .pt(s, lat, h) is the centre line, deeper is -z
  tunnel_hillside: (o) => put(o, tunnelHillside(o.tunnel)),
  tunnel_drips: (o) => put(o, tunnelDrips(o.tunnel, o.n)),
  flood_tripod: (o) => put(o, floodTripod(o)),
  caution_tape: (o) => put(o, cautionTape(o.a, o.b)),
  tape_post: (o) => put(o, tapePost()),
  infinite_tower: (o) => put(o, infiniteTower(o)),
  tower_platform: (o) => put(o, towerPlatform(o.color ?? '#50aebf', o.w, o.d)),
  tower_door_wall: (o) => put(o, towerDoorWall()),
  tower_ledge: (o) => put(o, towerLedge()),
  tower_field: (o) => put(o, towerField(o.rows)),
  chalk_stick: (o) => put(o, chalkStick()),
  paint_kit: (o) => put(o, paintKit()),
  rescue_radio: (o) => put(o, rescueRadio()),
  rescue_truck: (o) => put(o, rescueTruck(o)),
  camp_table: (o) => put(o, campTable()),
  wall_faces: (o) => put(o, wallFaces(o.tunnel, o.canvases, o)),
  mimic_puppet: (o) => put(o, puppet({ skin: '#b3aea4', bodyMat: paint('#a48a2a', { roughness: 0.5 }), sleeveMat: paint('#8f7826', { roughness: 0.55 }), au: 2.7, al: 3.1, lu: 2.5, ll: 2.9, finger: 0.6, head: false, hair: false, robe: false, width: 0.62, thick: 0.52, ...o })),
  home_fridge: (o) => put(o, fridge()),
  dining_chair: (o) => put(o, diningChair(o)),
  dining_table: (o) => put(o, diningTable(o)),
  home_bed: (o) => put(o, bed(o)),
  home_sofa: (o) => put(o, sofa(o)),
  potted_plant: (o) => put(o, plant(o)),
  pc_desk: (o) => put(o, pcDesk(o)),
  selection_box: (o) => put(o, selectionBox(o.w || 4, o.h || 4, o.d || 4, o)),
  modern_house: (o) => put(o, modernHouse(o)),
  kit_skyline: (o) => skyline(o),
  kit_crowd: (o) => crowd(o),
  kit_crate: (o) => put(o, crate(o)),
  kit_barrel: (o) => put(o, barrel(o)),
  kit_lamp: (o) => put(o, lamp(o)),
  kit_sign: (o) => put(o, sign(o.text || 'SIGN', o)),
  package_box: (o) => makeBox(o.parent),
  hero_house: (o) => buildHeroHouse(o.parent, o.x || 0, o.z || 0),
  model_house: (o) => cutaway(buildHeroHouse(o.parent, o.x || 0, o.z || 0)),
  cardboard_sky: (o) => cardboardSky(o.parent, o.centre || v3(0, 300, 0), o.size || 520),
  town: (o) => buildTown(o.parent, o),
  suburban_house: (o) => put(o, inGroup((g) => makeHouse(g, 0, 0, o.facing || 0, rng(o.seed || 1), o.floors || 2))),
  tree: (o) => put(o, inGroup((g) => makeTree(g, 0, 0, rng(o.seed || 1)))),
  car: (o) => put(o, makeCar(o.color || '#c0392b')),
  train_car: (o) => put(o, makeTrainCar(o.length || 24)),
  bird: (o) => put(o, makeBird(rng(o.seed || 1))),
  clock: (o) => put(o, makeClock(o.radius || 2, o.glow !== false)),
  star: (o) => put(o, makeStar(o.size || 2, o.color)),
  star_jar: (o) => put(o, makeJar()),
  living_cloud: (o) => put(o, makeCloud(o.size || 6, o.color || '#ffffff', o.seed || 1)),
  // .walk(pos, yaw, distance walked, body height): call it each frame; the legs follow
  walking_house: (o) => {
    const w = put(o, makeWalkerHouse(rng(o.seed || 1)));
    w.walk = (pos, yaw = 0, dist = 0, bodyH = 13) => updateWalker(w, pos, yaw, dist, bodyH);
    w.walk(o.pos || v3(0, 0, 0));
    return w;
  },
  watching_house: (o) => put(o, makeStillHouse()),
  clock_tower: (o) => put(o, makeClockTower()),
  // a forest tree with real bark and rustling leaves: treeShape's options (h, r0, spread, clumps, cols...), o.parent required.
  // Many trees: treeSet(parent, shapes, list) instances them, and .pose() leans them (see ep18.js)
  forest_tree: (o) => treeSet(o.parent, [treeShape(o)], [{ x: o.x || 0, z: o.z || 0, s: o.s || 1, yaw: o.yaw || 0, shape: 0 }]),
  // the enormous oak with a face in the bark: .glow(0..1) lights it, .group holds it
  hero_oak: (o) => heroOak(o.parent, { pos: o.pos || v3(0, 0, 0) }),
  // Episode 20's islands. tropical_island returns { group, heightAt, place(u, a), outline }: add .group; o = { seed, R, top, peak, pos }
  tropical_island: (o) => { const I = makeIsland({ seed: 20, R: 80, ...o }); if (o.parent) o.parent.add(I.group); return I; },
  palm: (o) => palms(o.parent, o.list || [{ x: o.x || 0, y: o.y || 0, z: o.z || 0, s: o.s || 1, ry: o.ry || 0 }]),
  sailboat: (o) => put(o, sailboat(o)),
  galleon: (o) => put(o, galleon(o)),
  beach_hut: (o) => put(o, hut(o)),
  market_stall: (o) => put(o, stall(o)),
  pier: (o) => put(o, dock(o.length || 46)),
  treasure_chest: (o) => put(o, chest(o)),
  katana: (o) => put(o, katana()),
  glass_fruit: (o) => put(o, fruit(o)),
  // a whole first-version city on the seabed: .set(t, t0, dur, depth) raises it; o = { keep(x, z), inner, outer, rings }
  ancient_city: (o) => city(o.parent, o),
  great_temple: (o) => put(o, greatTemple(o)),
  // ---------- Episode 21 (engine/hotel.js) ----------
  hotel_door: (o) => put(o, doorLeaf(o)),                 // hinge at the origin, leaf along +x; .handle (local)
  door_plate: (o) => put(o, plate(o.text || '100', o)),   // a lit brass number plate
  exit_sign: (o) => put(o, exitSign(o.text || 'EXIT')),
  flashlight: (o) => put(o, flashlight()),                // .lens along -y, .glass
  ceiling_tiles: (o) => ceilingTiles(o.parent, o),        // .update(t): tiles drop at fall(cell) seconds
  rubble_pile: (o) => rubble(o.parent, o),                // .update(t): chunks drop at list[i].t0
  hotel_tower: (o) => hotelTower(o.parent, o),            // .update(tGreen, tSweep, tFall, t): windows go green floor by floor, floors pancake
  // ---------- Episode 22 (engine/runway.js) ----------
  silver_gown: (o) => { const g = gown(o); if (o.parent) o.parent.add(g.mesh); return g; },   // put on a character's hips; .set(k, t): 0 flowing, 1 cinched
  dress_form: (o) => put(o, dressForm(o)),                // a dark-silver form wearing the gown, sparkling (.mat, .geo)
  star_paddle: (o) => put(o, starPaddle(o.arm ?? 2.2)),   // a judge's five-star card on a stick, for a character's arm
  golden_dragon: (o) => { const d = goldenDragon(o); put(o, d.g); return d; },   // a tiny golden pet dragon: .pose({ t, mode: sit|hover|fly|held|hop, mood, flap, ... }), .mouthAt()
  golden_key: (o) => put(o, goldenKey(o)),               // an emissive golden key with a heart bow (.userData.mat)
  golden_egg: (o) => put(o, goldenEgg(o)),               // a pet egg in two halves (.userData.top lifts off, .userData.mat glows)
  pastel_cottage: (o) => { const c = cottage(o); put(o, c.g); return c; },   // a pastel two-storey house with porch, siding, shutters; .door hinge, .edges for an outline, own:true for revealMat
  mailbox: (o) => put(o, mailbox(o)),                    // a street mailbox; old:true = rusty, leaning, no name
  framed_photo: (o) => { const f = framedPhoto(o.kind || 'dragon', o.face || null, o); put(o, f); return f; },   // a drawn photo in a frame; .setFace(0..1) restores an erased face
  // Episode 24 (engine/garden.js): a Grow-a-Garden town, a cube staircase to a floating island of glass plants, the name tree
  cube_seed: (o) => put(o, cubeSeed(o)),   // a tiny glowing blue cube seed (o.size, o.glow, o.sprout: a little sprout on top)
  cube_stairs: (o) => { const s = cubeStairs(o); if (o.parent) o.parent.add(s.g); return s; },   // a spiral of glowing cube steps round a light column; .update(t, height, fade), .at(k) step top, .angle(k)
  seed_stall: (o) => put(o, seedStall(o)),   // a garden seed stall with awning, seed packets and a SEED SHOP sign (front +z)
  garden_plot: (o) => { const b = new Batch(); gardenPlot(b, o.x || 0, o.z || 0, o); const g = new THREE.Group(); b.done(g); return put(o, g); },   // a soil plot with plank border; kind 'empty' or crops
  garden_props: (o) => put(o, inGroup((g) => { const a = wateringCan(), b = wheelbarrow(), c = scarecrow(); a.position.set(-3, 0, 0); c.position.set(3, 0, 0); g.add(a, b, c); })),   // watering can, wheelbarrow, scarecrow
  floating_island: (o) => put(o, floatingIsland(o)),   // a grassy floating island with rock underside, roots, floating rocks, waterfalls; .update(t)
  glass_plants: (o) => glassField(o.parent, o.list || [], o),   // instanced glowing blue glass plants (tulip, crystal, mush, fern, tree, bell, hedge); .update(t)
  name_tree: (o) => { const t = nameTree(o); put(o, t.g); return t; },   // a giant white-bark tree with a blue glass crown; .radius(y) to carve names (forest.js namePatches / heroPatch)
  bloom_field: (o) => bloomField(o.parent, o.spots || [], o),   // flowers that grow in a wave from a centre: .t0, .update(t)
  campfire: (o) => put(o, campfire(o)),   // a stone-ring campfire: logs, embers, orange flames, sparks, one shadowed warm light; .update(t), .level(k)
  camp_tent: (o) => put(o, tent(o)),   // an A-frame canvas tent with sagging sides, seams, open flaps, poles, guy ropes and pegs (w, d, h, color)
  camp_props: (o) => put(o, inGroup((g) => { const a = logSeat(5, 3), b = woodPile(4), c = axeStump(5), d = lantern(), e = cookPot(), f = bedroll(), h = supplyCrate(1);
    a.position.set(-5, 0, 0); b.position.set(-1, 0, 0); c.position.set(2.5, 0, 0); d.position.set(4.5, 0, 0); e.position.set(6.5, 0, 0); f.position.set(9, 0, 0); h.position.set(12, 0, 0); g.add(a, b, c, d, e, f, h); })),   // log seat, wood pile, axe stump, lantern, cook pot, bedroll, supply crate
  snowy_pines: (o) => pines(o.parent, o.list || [], o),   // instanced dark pines with frosted tips; list [{x, z, s}]; .vanish(fn)
  exit_gate: (o) => put(o, exitGate(o)),   // stone pillars and an arch with runes around a swirling portal; .set({ open, close, t })
  obby_platform: (o) => put(o, obbyPlatform(o.w ?? 5, o.d ?? 5, o.color ?? '#ff4757', o)),   // a candy obby platform with a neon top trim (.userData.edge); { num } paints a checkpoint number
  laser_cross: (o) => put(o, laserCross(o.arms ?? 2, o.len ?? 6)),   // a hub with crisp spinning laser beams: spin .beams.rotation.z
  control_chair: (o) => put(o, controlChair()),   // a futuristic control chair on a pedestal, holo panels (.holo), cushion top at .seatY
  hospital_bed: (o) => put(o, hospitalBed(o)),   // a white steel hospital bed, mint blanket; head at -z, mattress top at .top ({ occupied } for a body-sized blanket)
  ward_door: (o) => put(o, wardDoor(o)),   // a pale-green ward door leaf with kick plates and a window; hinge at its local origin, handle point .handle
  fluor_panel: (o) => put(o, fluorPanel(o.w ?? 3.6, o.d ?? 7.2, o)),   // a recessed fluorescent ceiling panel; .level(k) dims it (flicker)
  crt_tv: (o) => put(o, crtTV(o)),   // a ceiling-hung hospital CRT television; .screen faces +z (map a render target onto it)
  iv_pole: (o) => put(o, ivPole()),
  hospital_cabinet: (o) => put(o, cabinet()),
  pa_speaker: (o) => put(o, paSpeaker()),   // a round ceiling loudspeaker grille
  room_plate: (o) => put(o, roomPlate(o.text ?? '217', o)),   // a white enamel room-number plate
  bed_chart: (o) => put(o, bedChart(o.name ?? 'TYLER', o)),   // a clipboard chart with a patient name, for the foot of a bed
  porcelain_nurse: (o) => put(o, nurse()),   // an original faceless nurse: white uniform, cap with a green cross, a cracked porcelain mask (.mask); no gore
  endless_ward: (o) => wardBeds(o.parent, o.list ?? [-1, 0, 1].flatMap((i) => [0, 1].map((j) => ({ x: i * 6, z: j * 12, empty: i === 0 && j === 1 }))), o),   // instanced rows of occupied beds (closed-eye patients, o.faceMap); list [{ x, z, ry, empty }]
  hospital_block: (o) => hospitalBlock(o.parent, o),   // a derelict five-storey hospital; .lights(k, t) switches its windows on (22% stay dead)
  notice_sign: (o) => put(o, noticeSign(o.lines ?? ['DEMOLITION NOTICE'], o)),
  forest_beast: (o) => put(o, beast(o)),   // a blocky wolf-like creature with glowing eyes that blink; .update(t)
  snowfall: (o) => snow(o.parent, o),   // falling snow points (centre, size, height, count)
  // Episode 36 (engine/gameshow.js): a game show arena in an empty mall, hunters' masks, TVs on a street
  tv_screen_mat: (o) => screenMat(o),   // a CRT/LED screen material from a render target (o.rt) and/or a canvas texture (o.ui); uniforms rtK, uiK, k, noise, lines, crop, t
  flat_tv: (o) => put(o, flatTV(o.mat || screenMat(o), o)),   // a flat TV on a foot stand, screen faces +z; .screen, .base
  seat_banks: (o) => put(o, seatBanks(o)),   // tiered stadium seats round a square floor (instanced), gaps for tunnels
  mall_ring: (o) => put(o, mallRing(o)),   // an enormous mall's upper floors in a ring: balconies, lit and dark shopfronts with signs
  jumbotron: (o) => put(o, jumbotron(o.mat || screenMat(o), o)),   // a four-faced hanging scoreboard with LED rims; .screens
  countdown_draw: (o) => countdownDraw(o.ctx, o.w, o.h, o.sec, o),   // draws MM:SS (red under 10 s), a label and a bar on a 2D canvas
  roll_gate: (o) => put(o, rollGate(o)),   // a steel roll-down security shutter between posts; .set(bottomY)
  glass_shatter: (o) => glassShatter(o.parent, o.events, o),   // shop windows bursting into shards: [{t, c, n, w, h, p, push, power}]; .update(t)
  hunter_helmet: (o) => hunterHelmet(o.character, o),   // a black helmet with a white domed faceplate (o.number) over a CRT screen; .crack(k), .open(t, t0), .screen
  metal_pipe: (o) => put(o, metalPipe(o)),   // a scaffold pipe along +z; .tipLocal
  tv_house: (o) => put(o, tvHouse(o)),   // a suburban house facing -x whose five windows each hold a glowing TV (o.tvMat); .tvs
  studio_set: (o) => put(o, studioSet(o)),   // a game-show stage: podium, glitter backdrop, logo, 12 audience seats (.seats)
  shop_sign: (o) => shopSign(o.text, o),   // a glowing shop-sign material
  // Episode 34 (engine/tactical.js): a training facility, rifles, masked soldiers in sync, gunfire effects, toon blood
  training_rifle: (o) => put(o, trainingRifle(o)),   // along +z from the grip; .mag/.magRest, .muzzle, .guard; hold with tactical.js holdRifle(ch, rifle, aim, {recoil, down})
  masked_soldier_gear: (o) => soldierGear(o.character, o),   // a white featureless mask, a helmet, a target plate (o.number) on a character
  sync_ranks: (o) => syncRanks(o.parent, o.template, o.places, o),   // instanced copies of a posed template character (o.extra: its rifle); .update()
  muzzle_flashes: (o) => muzzleFlashes(o.parent, o.n ?? 64, o),   // .clear(), .set(i, pos, dir, k, size), .end(); flashK(times, t)
  tracers: (o) => tracers(o.parent, o.list, o),   // [{t, a, b, speed}]; .update(t)
  hit_particles: (o) => eventParticles(o.parent, o.events, o),   // kind spark | dust | chip | brass; [{t, p, n}]; .update(t)
  bullet_holes: (o) => bulletHoles(o.parent, o.holes),   // [{t, p, n}]; .update(t)
  smoke_haze: (o) => smokeHaze(o.parent, o),   // .update(t, amount)
  jersey_barrier: (o) => put(o, jerseyBarrier(o)),   // concrete barrier along x (o.len), top 3.08
  steel_door: (o) => put(o, steelDoor(o)),   // leaf along +x from the hinge; .set(angle)
  security_cam: (o) => put(o, securityCam()),   // .aim(yaw, pitch, led)
  wall_clock: (o) => put(o, wallClock(o)),   // faces +z; .set(h, m, s)
  training_hall: (o) => put(o, trainingHall(o)),   // a long industrial hall along -z with a side corridor; .lights(white, red, t), .beacons
  control_room: (o) => put(o, controlRoom(o)),   // desks, racks, a giant screen (.screen, give it a material), .cam
  feed_wall: (o) => feedWall(o.map, o),   // a CCTV wall material from a render target; .set({focus, msg, red, altK, t}), uniforms over/msgT/alt
  industrial_district: (o) => { const d = industrialDistrict(o); if (o.parent) o.parent.add(d.group); return d; },   // a night street to a facility gate; .lamps
  toon_blood: (o) => bloodFX(o.parent, o.events, o),   // shots / cuts: bursts, spray, splats, drips, pools; [{t, p, dir, n, power, pool:{at}, drip, end}]; .update(t)
  // Episode 33 (engine/arena.js): a floating magic arena and duel magic
  magic_arena: (o) => { const a = magicArena(o); if (o.parent) o.parent.add(a.group); return a; },   // .seats, .clock.set(h), .bell.set(a, ring), .update(t, {brazier, runes}), .under
  arena_ground: (o) => put(o, arenaGround(o)),   // ground round the arena (o.hole); move it down for the lift
  void_rocks: (o) => voidRocks(o.parent, o),   // drifting rocks; .update(t)
  falling_rocks: (o) => fallingRocks(o.parent, o),   // .set(age)
  fire_wall: (o) => put(o, fireWall(o)),   // along x; .set(k, t, [partX, partAmt], lightI)
  energy_orb: (o) => put(o, energyOrb(o)),   // .place(pos, olderPositions, k, t), .addTrailTo(parent)
  rune_shield: (o) => put(o, runeShield(o)),   // faces +z; .set(open, t, hit)
  shard_burst: (o) => shardBurst(o.parent, o),   // .fire(t0) then .update(t)
  shockwave_ring: (o) => put(o, shockwave(o)),   // .set(age, maxR, dur)
  magic_sigil: (o) => put(o, sigil(o)),   // .set(k, t)
  summon_beam: (o) => put(o, beam(o)),   // .set(k)
  ground_decal: (o) => put(o, decal(o.kind ?? 'scorch', o)),   // scorch | skid | crack; .set(opacity), scale the mesh
  arc_bolt: (o) => put(o, arcBolt(o)),   // .set(a, b, k, seed)
  fire_stream: (o) => put(o, fireStream(o)),   // .set(a, b, k, t)
  drift_particles: (o) => put(o, driftParticles(o.positions, o)),   // .set(age)
  shadow_crowd: (o) => put(o, shadowCrowd(o.seats, o)),   // .set({fill, yaw, eyes}, t)
  teleport_fx: (o) => put(o, teleportFx(o)),   // .set(age)
  magic_cloak: (o) => cloak(o.character, o),   // .wear(on), .update(follow) after posing, .dissolveU.uDis.value, .surfacePoints(n)
  // Episode 32 (engine/ruins.js, engine/blades.js): a storm island, its ruins, swords and armour
  storm_island: (o) => { const i = stormIsland(o); if (o.parent) o.parent.add(i.group); return i; },   // a rocky island with a flat plateau at .top; .heightAt(x, z)
  ruin_courtyard: (o) => put(o, courtyard(o)),   // a flagstone courtyard disc with a soft edge
  ruin_clock_tower: (o) => put(o, clockTower(o)),   // a ruined stone clock tower; .set(sec) ticks the hands, .facePos
  post_clock: (o) => put(o, postClock()),   // a street post clock; .set(sec)
  brick_wall: (o) => put(o, brickWall(o)),   // an instanced brick wall (x0..x1 at z); .set(t, tHit, hitPoint, dir) bursts it, a pure function of t
  crater: (o) => put(o, crater(o)),   // a ground crater with cracks; .set(t, tHit) opens it
  storm_sea: (o) => stormSea(o.parent, o),   // a storm sea shader that can split into a trench with water walls; .update(tw, split, flash), .floorY(x, z)
  storm_rain: (o) => stormRain(o.parent, o),   // rain streaks round .centre; .update(tw)
  time_crack: (o) => put(o, timeCrack(o)),   // a glowing violet crack in the air; .set(k, t)
  sword_cavern: (o) => put(o, cavern(o)),   // a dark cavern under an island; .floorY
  black_sword: (o) => put(o, blackSword(o)),   // a pure-black longsword (blade along +z from the grip, flat faces +y); .setGlow(k), .hilt2
  white_greatsword: (o) => put(o, whiteBlade(o)),   // a glowing white greatsword; .setGlow(k)
  plate_armor: (o) => armorSuit(o.character, o),   // dark plate armour fitted onto a character (o.character); .wind(t), .shatter(k, opts) for an empty suit bursting
  sword_field: (o) => swordField(o.parent, o),   // thousands of upright black swords stuck in the ground (instanced); .wake(t, speed, glow)
  // Episode 28 (engine/mansion.js): a Victorian mansion and its ballroom
  ornate_frame: (o) => put(o, ornateFrame(o.w ?? 3.4, o.h ?? 4.3, o)),   // a gilt picture frame facing +z; put a material on .pic (.picW x .picH)
  antique_print: (o) => put(o, loosePrint(o.mat || printMat(o), o.w ?? 2.4, o.h ?? 3.0, o)),   // a loose sepia photograph lying flat (printMat: a render target as an old print, scratches)
  invitation_card: (o) => put(o, invitation(o.lines ?? [['YOU ARE INVITED', 46, '700'], ['to a party', 40, 'italic']], o)),   // a gilt-edged card lying flat; .env its envelope with a wax seal
  chandelier: (o) => put(o, chandelier(o)),   // a brass candle chandelier with crystal drops; .level(k)
  wall_sconce: (o) => put(o, sconce(o)),   // a two-candle brass wall sconce, faces +z; .level(k)
  big_chair: (o) => put(o, bigChair(o)),   // a high-backed velvet dining chair, seat front +z
  banquet_table: (o) => put(o, banquetTable(o.len ?? 32, o.wid ?? 5, o)),   // a long cloth-covered table, runner; top height at .top
  gramophone: (o) => put(o, gramophone(o)),   // a horn gramophone on a side table
  grand_clock: (o) => put(o, grandClock(o)),   // a grandfather clock; .set(t) moves its hands and pendulum
  curtain_window: (o) => put(o, curtainWindow(o.w ?? 7, o.h ?? 15, o)),   // a tall night window with draped curtains, faces +z
  panel_door: (o) => put(o, panelDoor(o)),   // a panelled door leaf, hinge at the origin (.leaf)
  bare_trees: (o) => bareTrees(o.parent, o.spots ?? [[0, 0]], o),   // leafless winter trees at [x, z] spots
  victorian_mansion: (o) => put(o, mansion(o)),   // a two-storey mansion, front +z; .winRoom a lit room behind the upstairs window, .setSash(k), .blow(k, t), .lights(k)
  victorian_guest: (o) => put(o, guest(o.i ?? 0, o).root),   // one of 12 faceless Victorian party guests (gowns, top hats, pearls); a character rig
  wt_iron_boots: (o) => ironBoots(o.character),   // heavy iron diver boots worn over a character's feet (o.character)
  wt_paper_slippers: (o) => paperSlippers(o.character),   // paper slippers worn over a character's feet (o.character)
  wt_diver_belt: (o) => diverBelt(o.character),   // a lead diver's belt worn round a character (o.character); .set(on)
  wt_mitt: (o) => wtMitt(o.character, o.side ?? 1),   // a baseball mitt worn on one hand (o.character, o.side)
  wt_loose_boots: (o) => put(o, looseBoots()),   // a pair of unbuckled iron boots standing empty
  wt_lost_slipper: (o) => put(o, lostSlipper()),   // one paper slipper left on the floor
  wt_rope: (o) => put(o, wtRope()),   // a rope between two points; .set(a, b)
  wt_fire_ladder: (o) => fireLadder(o.a, o.b),   // a red fire-brigade extension ladder from point a to point b (o.a, o.b)
  wt_hall_clock: (o) => put(o, hallClock()),   // a big wall clock; .set(hours) moves the hands
  wt_founders_hall: (o) => put(o, foundersHall()),   // a round civic hall under a stained-glass dome with chandeliers and a dais; .glassY(x, z) is the glass height
  wt_glass_peacock: (o) => put(o, glassPeacock()),   // a tall glass peacock statue under a drape; .set(smash), .drape(k)
  wt_aunt_room: (o) => put(o, auntSet()),   // an aunt's dining room with a soup table; .bowl(), .top
  wt_kitchen: (o) => put(o, kitchenSet()),   // a bright kitchen with a window and table; .top
  wt_cereal_box: (o) => put(o, cerealBox()),   // a red and yellow cereal box
  wt_courtroom: (o) => put(o, courtroom()),   // a courtroom with a safety net under the ceiling; .netAt, .shapeNet
  wt_plumbwick: (o) => put(o, plumbwick()),   // a bright main street with terraced shops, bunting and a flat roof terrace; .RY is the roof height, .seat
  wt_brook_yard: (o) => put(o, brookYard()),   // a cottage yard with a picket fence and a pond; .FH is the fence height
  sg_greenhouse: (o) => put(o, sgGreenhouse()),   // a glass greenhouse on a brick plinth; .setBroken(k), .setBoards(k), .front, .size
  sg_bread_cart: (o) => put(o, breadCart()),   // a red bakery hand cart with loaves and a striped awning; .spin(angle) turns the wheels
  sg_garden_bench: (o) => put(o, gardenBench()),   // a slatted wooden garden bench; .seatY
  sg_cake_table: (o) => put(o, cakeTable()),   // a party table with a pink cake
  sg_party_hat: (o) => put(o, sgPartyHat()),   // a paper party hat
  sg_sick_bed: (o) => put(o, sickBed()),   // a wooden bed with pillows; .top is the mattress height
  sg_quilt: (o) => put(o, quilt()),   // a striped quilt that lies over the legs on sg_sick_bed
  sg_bedroom: (o) => put(o, ruthRoom()),   // a papered bedroom centred on the origin, window on +x, the bed's head at -z
  sg_flower: (o) => put(o, flowerMesh(o.kind ?? 'dahlia', o.size ?? 1, o.tint)),   // one bloom: kind 'dahlia' | 'buttercup' | 'thistle'
  sg_larkspur: (o) => larkspur(o.parent),   // the whole bright village set: street, lane, yard, greenhouse, cottage, bakery; returns its named parts
};
