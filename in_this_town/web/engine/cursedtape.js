// Episode 38's kit: a teen's bedroom that can turn into a hotel room, a laptop with a screen that shows a canvas UI or a render target, a hotel corridor,
// and the porter's head wound in magnetic tape. Original designs. The creeping wallpaper and carpet are a discard radius round a point, a pure function of its uniform.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { v3, rng } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';
import { wallpaper, carpet } from './hotel.js';

export const ROOM = { W: 12, D: 12, H: 11.5, dx0: 1.8, dx1: 6.4, dh: 8.8, cx0: -9.6, cx1: -4.6 };

// a material that only exists within U.value of a point, with a torn noise edge
export function creepMat(base, centre, U) {
  const m = base.clone(); m.userData = { ...base.userData };
  m.onBeforeCompile = (s) => { s.uniforms.uCreep = U;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPc = (modelMatrix * vec4(position, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPc; uniform float uCreep;
      float hc(vec3 p){ return fract(sin(dot(p, vec3(12.98, 78.23, 37.71))) * 43758.5); }
      float nc(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(hc(i), hc(i + vec3(1,0,0)), f.x), mix(hc(i + vec3(0,1,0)), hc(i + vec3(1,1,0)), f.x), f.y), mix(mix(hc(i + vec3(0,0,1)), hc(i + vec3(1,0,1)), f.x), mix(hc(i + vec3(0,1,1)), hc(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      { float dc = distance(vWPc, vec3(${centre.x.toFixed(2)}, ${centre.y.toFixed(2)}, ${centre.z.toFixed(2)})); float n1 = nc(vWPc * 0.55) * 3.4 + nc(vWPc * 2.3) * 1.1; if (dc + n1 > uCreep) discard; }`);
  };
  m.customProgramCacheKey = () => 'creep38'; return m;
}

// a laptop: user at +z, hinge at the back. g.setLid(a): a = 0 closed flat, 1 open. g.screenM takes a canvas UI and a feed
export function laptop(o = {}) {
  const g = new THREE.Group(), W = o.w ?? 3.1, D = o.d ?? 1.9, Hl = o.h ?? 1.92, b = new Batch(), sh = paint('#2a2d33', { metalness: 0.65, roughness: 0.34 }), dk = paint('#14161a', { roughness: 0.5 });
  b.box(sh, W, 0.12, D, 0, 0.06, 0, { r: 0.04 });
  b.box(dk, W - 0.22, 0.02, D * 0.56, 0, 0.125, -D * 0.14, { r: 0.01 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) b.box(paint('#3a3e46', { roughness: 0.45 }), 0.2, 0.03, 0.17, -1.21 + c * 0.22, 0.142, -D * 0.38 + r * 0.205, { r: 0.012 });
  b.box(paint('#23262b', { roughness: 0.3, metalness: 0.4 }), 1.06, 0.015, 0.56, 0, 0.127, D * 0.3, { r: 0.01 });
  b.done(g);
  const lid = new THREE.Group(); lid.position.set(0, 0.13, -D / 2); g.add(lid); const bl = new Batch();
  bl.box(sh, W, Hl, 0.07, 0, Hl / 2, 0, { r: 0.03 }); bl.box(dk, W - 0.04, Hl - 0.04, 0.012, 0, Hl / 2, 0.04, { r: 0.006 }); bl.done(lid);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), paint('#7e848e', { metalness: 0.9, roughness: 0.25 })); logo.rotation.y = Math.PI; logo.position.set(0, Hl * 0.56, -0.042); lid.add(logo);
  const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 800; const ui = new THREE.CanvasTexture(cv); ui.colorSpace = THREE.SRGBColorSpace; ui.anisotropy = 8;
  const m = new THREE.ShaderMaterial({ toneMapped: false, fog: false, uniforms: { ui: { value: ui }, feed: { value: null }, feedK: { value: 0 }, k: { value: 1 }, tm: { value: 0 }, tear: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D ui, feed; uniform float feedK, k, tm, tear; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec3 c = texture2D(ui, vUv).rgb;
        if (feedK > 0.0) { vec2 q = vUv; float band = floor(q.y * 40.0); q.x += tear * (h(vec2(band, floor(tm * 24.0))) - 0.5) * 0.2; vec3 s = texture2D(feed, q).rgb; s = 1.0 - exp(-s * 1.5);
          float L = dot(s, vec3(0.3, 0.6, 0.1)); s = mix(vec3(L), s, 0.5); s *= 0.92 + 0.08 * sin(vUv.y * 620.0); s += (h(vUv * 800.0 + tm) - 0.5) * 0.07; c = mix(c, s, feedK); }
        gl_FragColor = vec4(c * k, 1.0); }` });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, Hl - 0.2), m); scr.position.set(0, Hl / 2, 0.048); scr.userData.noAO = true; lid.add(scr);
  g.lid = lid; g.screenM = m; g.ui = cv; g.uiX = cv.getContext('2d'); g.uiTex = ui; g.scr = scr; g.Hl = Hl; g.D = D;
  g.setLid = (a) => { lid.rotation.x = (1 - a) * (Math.PI / 2) * 0.995 + a * -0.24; };
  g.top = () => lid.localToWorld(v3(0, Hl, 0.04));
  g.setLid(1); return g;
}

// the bedroom: x -12..12, z -12..12; desk at +z, door and closet in the back wall (z -12), window in the west wall, bed on the east wall
export function bedroom(U) {
  const g = new THREE.Group(), R = ROOM, b = new Batch(), wall = surf('stucco', '#6c7d92', { roughness: 0.92 }), trim = paint('#e4e0d6', { roughness: 0.5 }), wood = surf('plank', '#7a5a42', { roughness: 0.55 });
  wood.userData.span = 8; wall.userData.span = 10;
  b.box(wood, 25, 0.4, 25, 0, -0.2, 0, { r: 0.02 }); b.box(paint('#c8c4ba', { roughness: 0.92 }), 25, 0.4, 25, 0, R.H + 0.2, 0, { r: 0.02 });
  const wz = (x0, x1, y0, y1, z, t = 0.6) => b.box(wall, x1 - x0, y1 - y0, t, (x0 + x1) / 2, (y0 + y1) / 2, z, { r: 0.01 });
  const wx = (z0, z1, y0, y1, x, t = 0.6) => b.box(wall, t, y1 - y0, z1 - z0, x, (y0 + y1) / 2, (z0 + z1) / 2, { r: 0.01 });
  wz(-12.5, R.cx0, 0, R.H, -12.3); wz(R.cx1, R.dx0, 0, R.H, -12.3); wz(R.dx1, 12.5, 0, R.H, -12.3); wz(R.cx0, R.cx1, 8.7, R.H, -12.3); wz(R.dx0, R.dx1, R.dh, R.H, -12.3);
  wz(-12.5, 12.5, 0, R.H, 12.3); wx(-12, 12, 0, R.H, 12.3);
  wx(-12, -4, 0, R.H, -12.3); wx(4, 12, 0, R.H, -12.3); wx(-4, 4, 0, 3.8, -12.3); wx(-4, 4, 9.2, R.H, -12.3);
  // skirting and crown
  const sk = (x, z, w, d) => { b.box(trim, w, 0.55, d, x, 0.28, z, { r: 0.04 }); b.box(trim, w, 0.28, d, x, R.H - 0.14, z, { r: 0.04 }); };
  sk(0, 11.96, 24, 0.14); sk(11.96, 0, 0.14, 24); sk(-11.96, -8, 0.14, 8); sk(-11.96, 8, 0.14, 8); sk((-12 + R.cx0) / 2, -11.96, R.cx0 + 12, 0.14); sk((R.cx1 + R.dx0) / 2, -11.96, R.dx0 - R.cx1, 0.14); sk((R.dx1 + 12) / 2, -11.96, 12 - R.dx1, 0.14);
  // door casing
  for (const x of [R.dx0 - 0.28, R.dx1 + 0.28]) b.box(trim, 0.56, R.dh + 0.5, 0.26, x, (R.dh + 0.5) / 2, -11.94, { r: 0.05 }); b.box(trim, R.dx1 - R.dx0 + 1.1, 0.56, 0.26, (R.dx0 + R.dx1) / 2, R.dh + 0.28, -11.94, { r: 0.05 });
  // the closet: a dark alcove with one sliding door pushed halfway, a rail and hanging clothes
  for (const x of [R.cx0 - 0.25, R.cx1 + 0.25]) b.box(trim, 0.5, 9, 0.26, x, 4.5, -11.94, { r: 0.05 }); b.box(trim, R.cx1 - R.cx0 + 1, 0.5, 0.26, (R.cx0 + R.cx1) / 2, 8.95, -11.94, { r: 0.05 });
  const dk = paint('#08080c', { roughness: 0.95 }); b.box(dk, 6, 9, 0.3, (R.cx0 + R.cx1) / 2, 4.5, -16.5, { r: 0.01 }); for (const x of [R.cx0 - 0.15, R.cx1 + 0.15]) b.box(dk, 0.3, 9, 4.6, x, 4.5, -14.3, { r: 0.01 }); b.box(dk, 6, 0.3, 4.6, (R.cx0 + R.cx1) / 2, 8.8, -14.3, { r: 0.01 });
  b.box(paint('#d9d4c9', { roughness: 0.6 }), 2.55, 8.5, 0.16, R.cx0 + 1.27, 4.3, -12.2, { r: 0.03 }); b.cyl(paint('#555a60', { metalness: 0.7 }), 0.06, 0.06, 4.6, (R.cx0 + R.cx1) / 2, 7.9, -14.2, { rz: Math.PI / 2 });
  const hgc = ['#1d2a44', '#3f1f1f', '#26303a', '#4a3a22']; hgc.forEach((c, i) => b.box(paint(c, { roughness: 0.9 }), 0.16, 3.6, 1.6, R.cx0 + 0.7 + i * 0.55, 6, -14.2, { r: 0.05 }));
  // window (west wall): frame, sill, blinds
  const wf = paint('#e8e4da', { roughness: 0.5 });
  for (const z of [-4.1, 4.1, 0]) b.box(wf, 0.5, 5.6, 0.22, -12.05, 6.5, z, { r: 0.03 }); for (const y of [3.85, 9.15]) b.box(wf, 0.5, 0.25, 8.4, -12.05, y, 0, { r: 0.03 }); b.box(wf, 1.0, 0.18, 8.8, -11.75, 3.7, 0, { r: 0.04 });
  for (let i = 0; i < 4; i++) b.box(paint('#e2ddcf', { roughness: 0.6 }), 0.5, 0.09, 8, -11.85, 9.0 - i * 0.2, 0, { r: 0.02, rz: 0.5 });
  // curtains
  const cu = paint('#51506f', { roughness: 0.96 }); for (const s of [-1, 1]) for (let i = 0; i < 7; i++) b.box(cu, 0.34, 7.6, 0.42, -11.4 + (i % 2) * 0.16, 5.6, s * (4.45 + i * 0.36), { r: 0.14 });
  b.cyl(paint('#3a3a40', { metalness: 0.6 }), 0.07, 0.07, 12.4, -11.2, 9.5, 0, { rx: Math.PI / 2 });
  // desk, drawers, shelf, a chair
  const dW = surf('plank', '#3f3026', { roughness: 0.48 }); dW.userData.span = 6; const blk = paint('#1a1c21', { roughness: 0.45, metalness: 0.25 });
  b.box(dW, 13, 0.3, 4.7, 0, 3.85, 9.5, { r: 0.05 }); b.box(blk, 0.34, 3.7, 4.2, -6, 1.85, 9.5, { r: 0.04 }); b.box(blk, 3.2, 3.7, 4.2, 5, 1.85, 9.5, { r: 0.05 });
  for (let i = 0; i < 3; i++) { b.box(dW, 2.9, 1.0, 0.1, 5, 0.75 + i * 1.15, 7.34, { r: 0.03 }); b.box(paint('#b7b7b7', { metalness: 0.8 }), 0.9, 0.08, 0.12, 5, 0.9 + i * 1.15, 7.26, { r: 0.03 }); }
  b.box(dW, 12, 0.24, 1.5, 0, 8.3, 11.25, { r: 0.04 });
  const bookc = ['#a33b2d', '#3a6ea5', '#d9b347', '#3d8a63', '#7b4a97', '#c97131', '#2f3a55', '#b8506b', '#4a8d9a'];
  for (let i = 0; i < 16; i++) { const h = 1.0 + ((i * 7) % 4) * 0.14; b.box(paint(bookc[i % 9], { roughness: 0.75 }), 0.26, h, 1.0, -5.4 + i * 0.31, 8.42 + h / 2, 11.2, { r: 0.03 }); }
  b.box(paint('#9a7b52'), 2.0, 1.1, 1.1, 2.6, 9.0, 11.25, { r: 0.05 }); b.box(paint('#5f7a8e'), 1.6, 0.9, 1.1, 4.7, 8.9, 11.25, { r: 0.05 });
  b.cyl(paint('#c94f3d', { roughness: 0.5 }), 0.3, 0.26, 0.62, 3.1, 4.31, 8.6); b.box(paint('#f0e68c', { roughness: 0.9 }), 0.9, 0.02, 0.9, -3.3, 4.01, 8.4, { r: 0.005 }); b.box(paint('#86c5da', { roughness: 0.9 }), 0.9, 0.02, 0.9, -4.3, 4.01, 8.8, { r: 0.005 });
  const lampM = paint('#26282e', { metalness: 0.6, roughness: 0.3 }); b.cyl(lampM, 0.55, 0.62, 0.12, 4.0, 4.06, 10.2); b.cyl(lampM, 0.05, 0.05, 2.3, 4.0, 5.2, 10.2); b.cyl(lampM, 0.34, 0.62, 0.7, 4.0, 6.3, 10.0);
  const seatC = paint('#26303e', { roughness: 0.85 }), ch = new Batch(); ch.box(seatC, 3, 0.5, 2.9, 0, 2.05, 0, { r: 0.18 }); ch.box(seatC, 3, 3.4, 0.46, 0, 4.1, -1.35, { r: 0.2 }); ch.cyl(lampM, 0.17, 0.17, 1.4, 0, 1.1, 0); for (let i = 0; i < 5; i++) { const a = i * 1.256; ch.box(lampM, 1.6, 0.14, 0.26, Math.cos(a) * 0.8, 0.26, Math.sin(a) * 0.8, { r: 0.05, ry: -a }); } const chairG = new THREE.Group(); ch.done(chairG); chairG.position.set(0, 0, 5.85); g.add(chairG); g.chair = chairG;
  // bed (east wall, head at -z), a nightstand, a rug
  const cover = paint('#b4532a', { roughness: 0.9 }), sheet = paint('#e8e6e0', { roughness: 0.85 }), bw = surf('plank', '#574032');
  b.box(bw, 6.8, 1.1, 12.3, 8.6, 0.7, -1, { r: 0.08 }); b.box(sheet, 6.4, 1, 12, 8.6, 1.75, -1, { r: 0.28 }); b.box(cover, 6.6, 0.5, 8, 8.6, 2.3, 1.1, { r: 0.22 }); b.box(bw, 7.2, 5.4, 0.44, 8.6, 2.7, -7.4, { r: 0.08 }); b.box(paint('#eef0f2', { roughness: 0.9 }), 5, 0.9, 2.4, 8.6, 2.7, -5.4, { r: 0.4 });
  b.cyl(paint('#31405a', { roughness: 0.97 }), 6.6, 6.6, 0.06, -2.2, 0.04, -1.4);
  b.done(g);
  g.lampHead = v3(4.0, 6.1, 9.9);
  // wall art (the series' easter eggs) and a toyfan card
  const art = (url, x, y, z, ry, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#c9c9c9', roughness: 0.7 })); m.position.set(x, y, z); m.rotation.y = ry; new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; m.material.map = t; m.material.needsUpdate = true; }); g.add(m); };
  art('/web/assets/eggs/llamacorn.jpg', 8.2, 7.2, 11.9, Math.PI, 3.1, 3.1); art('/web/assets/eggs/roblox_song.jpg', -8.8, 7.0, 11.9, Math.PI, 3.1, 3.1);
  const tf = canvasTex(512, 300, (x, w, h) => { x.fillStyle = '#ffcb2e'; x.fillRect(0, 0, w, h); x.fillStyle = '#1b1b1f'; x.font = '900 86px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText('TOY FAN', w / 2, 128); x.fillText('TV', w / 2, 226); }); tf.colorSpace = THREE.SRGBColorSpace;
  const tc = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshStandardMaterial({ map: tf, roughness: 0.75 })); tc.position.set(11.9, 7.2, 3); tc.rotation.y = -Math.PI / 2; g.add(tc);
  // the hotel, creeping out of the door: wallpaper over the walls, carpet over the floor
  const C = v3((R.dx0 + R.dx1) / 2, 4.2, -12), wp = wallpaper('#3a1e22', '#6a3b2c'); wp.map.repeat.set(24 / 7, 11.5 / 7); const pap = creepMat(wp, C, U);
  const cp = carpet(); cp.map.repeat.set(24 / 9, 24 / 9); const crp = creepMat(cp, C, U);
  const ov = (m, w, h, x, y, z, ry, rx = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); p.userData.noAO = true; p.receiveShadow = true; g.add(p); };
  const seg = (x0, x1, y0, y1) => ov(pap, x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2, -11.86, 0);
  seg(-12, R.cx0 - 0.5, 0.55, R.H - 0.3); seg(R.cx1 + 0.5, R.dx0 - 0.56, 0.55, R.H - 0.3); seg(R.dx1 + 0.56, 12, 0.55, R.H - 0.3); seg(R.dx0 - 0.56, R.dx1 + 0.56, R.dh + 0.56, R.H - 0.3); seg(R.cx0 - 0.5, R.cx1 + 0.5, 9.2, R.H - 0.3);
  ov(pap, 24, R.H - 0.85, 0, 6.0, 11.86, Math.PI); ov(pap, 24, R.H - 0.85, 11.86, 6.0, 0, -Math.PI / 2); ov(pap, 8, R.H - 0.85, -11.86, 6.0, 8, Math.PI / 2); ov(pap, 8, R.H - 0.85, -11.86, 6.0, -8, Math.PI / 2); ov(pap, 8, 3.25, -11.86, 2.2, 0, Math.PI / 2);
  ov(crp, 24, 24, 0, 0.05, 0, 0, -Math.PI / 2);
  g.R = R; return g;
}

// the hotel corridor of the recording, along +z: x -8..8, H 12; doors every 16 studs from z 10
export function hotelHall() {
  const g = new THREE.Group(), b = new Batch(), wp = wallpaper('#3a1e22', '#6a3b2c'), dk = surf('plank', '#2c1710', { roughness: 0.5 }), mould = paint('#1e0f09', { roughness: 0.42 }), brass = paint('#b98d3c', { metalness: 0.85, roughness: 0.32 }), H = 12, HW = 8, Z = 110;
  dk.userData.span = 7; b.box(carpet(), HW * 2 + 0.6, 0.4, Z, 0, -0.2, Z / 2 - 2, { r: 0.02 }); b.box(paint('#a9a48e', { roughness: 0.9 }), HW * 2 + 0.6, 0.4, Z, 0, H + 0.2, Z / 2 - 2, { r: 0.02 });
  for (let z = 8; z < Z; z += 16) b.box(paint('#d8cfae', { roughness: 0.6 }), 4.2, 0.14, 2.4, 0, H - 0.06, z, { r: 0.05 });
  const DZ = [10, 26, 42, 58, 74, 90], run = (s, z0, z1) => { const x = s * (HW + 0.3), m = (z0 + z1) / 2, l = z1 - z0; b.box(wp, 0.6, H, l, x, H / 2, m, { r: 0.01 }); b.box(dk, 0.3, 3.8, l, s * (HW - 0.02), 1.9, m, { r: 0.02 }); b.box(mould, 0.42, 0.26, l, s * (HW - 0.12), 3.85, m, { r: 0.05 }); b.box(mould, 0.42, 0.5, l, s * (HW - 0.12), 0.25, m, { r: 0.05 }); b.box(mould, 0.5, 0.5, l, s * (HW - 0.14), H - 0.25, m, { r: 0.08 }); };
  for (const s of [1, -1]) { let z = -3; DZ.forEach((d) => { run(s, z, d - 2.6); z = d + 2.6; b.box(wp, 0.6, H - 9.2, 5.2, s * (HW + 0.3), 9.2 + (H - 9.2) / 2, d, { r: 0.01 }); for (const q of [-2.45, 2.45]) b.box(dk, 0.8, 9.6, 0.5, s * (HW + 0.05), 4.8, d + q, { r: 0.05 }); b.box(dk, 0.8, 0.6, 5.4, s * (HW + 0.05), 9.4, d, { r: 0.05 }); }); run(s, z, Z); }
  b.box(paint('#0a0606'), HW * 2 + 2, H, 0.6, 0, H / 2, Z - 2, { r: 0.01 }); b.box(paint('#0a0606'), HW * 2 + 2, H, 0.6, 0, H / 2, -3.3, { r: 0.01 });
  // a linen trolley
  const st = paint('#a9aeb0', { metalness: 0.8, roughness: 0.3 }), cl = paint('#cdc6b4', { roughness: 0.9 }); b.box(st, 3, 0.14, 5, 5.8, 3, 56, { r: 0.04 }); b.box(st, 3, 0.14, 5, 5.8, 1, 56, { r: 0.04 }); for (const [p, q] of [[-1.4, -2.4], [1.4, -2.4], [-1.4, 2.4], [1.4, 2.4]]) b.cyl(st, 0.07, 0.07, 3, 5.8 + p, 1.5, 56 + q); for (let i = 0; i < 4; i++) b.box(cl, 2.2, 0.5, 1, 5.8, 3.3 + i * 0.5, 54.7 + (i % 2) * 2.4, { r: 0.12 });
  b.done(g);
  g.doorZ = DZ;
  const sc = new Batch(), Hs = 8.4; g.sconceZ = []; for (let z = 18; z < Z - 8; z += 16) { g.sconceZ.push(z); for (const s of [1, -1]) { const x = s * (HW - 0.1); sc.box(brass, 0.12, 1.2, 0.6, x, Hs - 0.3, z, { r: 0.04 }); sc.cyl(paint('#ffcf98', { roughness: 0.4, emissive: '#ffb060', emissiveIntensity: 1.1 }), 0.38, 0.58, 0.85, s * (HW - 0.78), Hs, z); } } sc.done(g);
  return g;
}

// the porter's head: a blocky head wound in tape, one eye open, a mouth under the bands. g.set({ gaze: [x, y], mouth: 0..1 })
export function tapeHead(B) {
  const g = new THREE.Group(), w = B.max.x - B.min.x, h = B.max.y - B.min.y, d = B.max.z - B.min.z, zf = d / 2 + 0.002;
  g.position.set((B.min.x + B.max.x) / 2, (B.min.y + B.max.y) / 2, (B.min.z + B.max.z) / 2);
  const box = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 5, Math.min(w, h) * 0.2), new THREE.MeshStandardMaterial({ color: '#cfc9bb', roughness: 0.72 })); box.castShadow = true; g.add(box);
  const faceT = canvasTex(1024, 1024, (x, W, H) => {
    x.fillStyle = '#cdc6b6'; x.fillRect(0, 0, W, H); const r = rng(38); for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '90,70,60' : '220,210,190'},${r() * 0.05})`; x.beginPath(); x.ellipse(r() * W, r() * H, 3 + r() * 26, 3 + r() * 16, r() * 3, 0, 7); x.fill(); }
    for (const [px, py, rx, ry, a] of [[314, 410, 150, 118, 0.36], [706, 410, 150, 118, 0.42]]) { const g2 = x.createRadialGradient(px, py, 20, px, py, rx * 1.2); g2.addColorStop(0, `rgba(20,14,14,${a * 2})`); g2.addColorStop(1, 'rgba(20,14,14,0)'); x.fillStyle = g2; x.beginPath(); x.ellipse(px, py, rx * 1.2, ry * 1.2, 0, 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(60,40,36,0.55)'; x.lineWidth = 3; for (let i = 0; i < 16; i++) { let px = r() * W, py = r() * H; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 90; py += r() * 70; x.lineTo(px, py); } x.stroke(); }
  }); faceT.colorSpace = THREE.SRGBColorSpace;
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.94), new THREE.MeshStandardMaterial({ map: faceT, roughness: 0.68 })); fp.position.z = zf; g.add(fp); fp.userData.noAO = true;
  const eT = canvasTex(256, 256, (x, W, H) => { x.fillStyle = '#efe9dc'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(150,20,24,0.8)'; const r = rng(4); for (let i = 0; i < 26; i++) { const a = r() * 6.28; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); x.lineTo(128 + Math.cos(a + 0.2) * 44, 128 + Math.sin(a + 0.2) * 44); x.stroke(); } }); eT.colorSpace = THREE.SRGBColorSpace;
  const eyeW = w * 0.21, ex = w * 0.23, ey = h * 0.09;
  const eyeBg = new THREE.Mesh(new THREE.CircleGeometry(eyeW * 0.62, 28), new THREE.MeshBasicMaterial({ color: '#050303' })); eyeBg.position.set(ex, ey, zf + 0.004); g.add(eyeBg); eyeBg.userData.noAO = true;
  const eye = new THREE.Mesh(new THREE.CircleGeometry(eyeW * 0.5, 28), new THREE.MeshStandardMaterial({ map: eT, roughness: 0.2, emissive: '#fff4e0', emissiveMap: eT, emissiveIntensity: 0.25 })); eye.position.set(ex, ey, zf + 0.008); eye.userData.noAO = true; g.add(eye);
  const pup = new THREE.Mesh(new THREE.CircleGeometry(eyeW * 0.095, 18), new THREE.MeshBasicMaterial({ color: '#06040a' })); pup.position.set(ex, ey, zf + 0.012); pup.userData.noAO = true; g.add(pup);
  const mT = canvasTex(512, 256, (x, W, H) => { x.clearRect(0, 0, W, H); x.fillStyle = '#080406'; x.beginPath(); x.roundRect(8, 8, W - 16, H - 16, 38); x.fill(); x.fillStyle = '#e4dcc8'; for (let i = 0; i < 12; i++) { x.fillRect(22 + i * 39, 16, 32, 66); x.fillRect(22 + i * 39, H - 82, 32, 66); } x.strokeStyle = '#2a0a10'; x.lineWidth = 8; x.beginPath(); x.roundRect(8, 8, W - 16, H - 16, 38); x.stroke(); }); mT.colorSpace = THREE.SRGBColorSpace;
  const mw = w * 0.66, mouth = new THREE.Mesh(new THREE.PlaneGeometry(mw, mw * 0.48), new THREE.MeshStandardMaterial({ map: mT, transparent: true, roughness: 0.6, depthWrite: false })); mouth.position.set(0, -h * 0.27, zf + 0.01); mouth.userData.noAO = true; g.add(mouth);
  const tp = paint('#17131a', { roughness: 0.22, metalness: 0.38 }), tapeF = canvasTex(1024, 1024, (x) => { x.clearRect(0, 0, 1024, 1024);
    const band = (x0, y0, x1, y1, wd, sh) => { const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0) + 120; x.save(); x.translate((x0 + x1) / 2, (y0 + y1) / 2); x.rotate(a); x.fillStyle = '#17131a'; x.fillRect(-L / 2, -wd / 2, L, wd); const g3 = x.createLinearGradient(0, -wd / 2, 0, wd / 2); g3.addColorStop(0, 'rgba(120,108,122,0.5)'); g3.addColorStop(0.5 + sh * 0.2, 'rgba(255,240,230,0.18)'); g3.addColorStop(1, 'rgba(40,32,44,0.4)'); x.fillStyle = g3; x.fillRect(-L / 2, -wd / 2, L, wd); x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineWidth = 2; x.strokeRect(-L / 2, -wd / 2, L, wd); x.fillStyle = 'rgba(190,180,200,0.22)'; x.font = '700 26px Consolas, monospace'; for (let i = -6; i < 6; i++) x.fillText('013', i * 150, wd * 0.14); x.restore(); };
    band(-40, 150, 1060, 96, 92, 0.2); band(-30, 248, 1060, 190, 74, -0.3); band(150, 90, 520, 1010, 126, 0.5); band(1060, 720, -40, 866, 84, 0.1); band(-40, 584, 500, 498, 52, -0.2); band(1060, 318, 660, 290, 30, 0.4); });
  tapeF.colorSpace = THREE.SRGBColorSpace; const tf = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.02, h * 1.02), new THREE.MeshStandardMaterial({ map: tapeF, transparent: true, roughness: 0.28, metalness: 0.3, depthWrite: false })); tf.position.z = zf + 0.024; tf.userData.noAO = true; g.add(tf);
  const wrap = new Batch(); for (const [y, t, rz] of [[h * 0.38, 0.17, 0.1], [h * 0.21, 0.14, -0.05], [-h * 0.34, 0.15, 0.14]]) wrap.box(tp, w * 1.05, t, d * 1.05, 0, y, 0, { r: 0.02, rz }); wrap.done(g);
  const rib = (x, z, ln, ph) => { const gg = new THREE.PlaneGeometry(0.17, ln, 1, 18), p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), u = (ln / 2 - y) / ln; p.setXYZ(i, p.getX(i) + Math.sin(u * 7 + ph) * 0.13 * u, y - ln / 2, Math.cos(u * 5 + ph) * 0.14 * u); } gg.computeVertexNormals(); const m = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: '#17131a', roughness: 0.22, metalness: 0.4, side: THREE.DoubleSide })); m.position.set(x, -h * 0.3, z); m.castShadow = true; g.add(m); };
  rib(-w * 0.52, d * 0.15, 2.6, 1.0); rib(w * 0.52, -d * 0.1, 1.9, 2.2); rib(-w * 0.2, -d * 0.52, 3.2, 0.3); rib(w * 0.3, d * 0.52, 1.35, 3.8);
  const cap = new Batch(), bu = paint('#4c1420', { roughness: 0.6 }); cap.cyl(bu, w * 0.42, w * 0.46, h * 0.28, 0, h * 0.62, 0); cap.cyl(paint('#c6a050', { metalness: 0.8, roughness: 0.3 }), w * 0.462, w * 0.462, h * 0.07, 0, h * 0.5, 0); cap.done(g);
  g.set = ({ gaze = [0, 0], mouth: mo = 0 } = {}) => { pup.position.x = ex + gaze[0] * eyeW * 0.28; pup.position.y = ey + gaze[1] * eyeW * 0.28; mouth.scale.y = Math.max(0.08, mo); };
  g.set({}); return g;
}

// display-referred tape degradation for a full-frame recording
export const TapeShader = {
  uniforms: { tDiffuse: { value: null }, tm: { value: 0 }, tear: { value: 0 }, roll: { value: 0 }, wash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float tm, tear, roll, wash;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec2 uv = vUv; uv.y = fract(uv.y + roll);
      float band = floor(uv.y * 72.0), rnd = h(vec2(band, floor(tm * 30.0)));
      uv.x += tear * (rnd - 0.5) * 0.3 * step(0.5, h(vec2(band * 1.7, floor(tm * 22.0))));
      float wob = sin(uv.y * 28.0 + tm * 7.0) * 0.0009 + sin(uv.y * 5.0 + tm * 2.3) * 0.0014; uv.x += wob;
      float ca = 0.0017 + tear * 0.009;
      vec3 s = vec3(texture2D(tDiffuse, uv + vec2(ca, 0.0)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(ca, 0.0)).b);
      float L = dot(s, vec3(0.3, 0.6, 0.1)); s = mix(vec3(L), s, 0.62); s = s * vec3(1.02, 0.98, 0.93) + vec3(0.018, 0.014, 0.02);
      s *= 0.955 + 0.045 * sin(vUv.y * 1920.0 * 1.05);
      float n = h(vUv * vec2(1123.0, 2011.0) + fract(tm) * 91.0) - 0.5; s += n * 0.052;
      float tp = fract(vUv.y * 0.6 + tm * 0.19); s += smoothstep(0.985, 1.0, tp) * 0.1;
      s += tear * smoothstep(0.82, 1.0, rnd) * 0.22;
      s = mix(s, vec3(h(vUv * 900.0 + tm * 5.0)), wash);
      gl_FragColor = vec4(clamp(s, 0.0, 1.0), 1.0); }`,
};
