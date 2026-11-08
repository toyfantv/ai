// Episode 36 (The Last Contestant): a televised survival game staged in an empty shopping mall. Original designs only.
//   screenMat(o)            a TV / jumbotron screen: a render target and / or a canvas, scan lines, static, brightness (.uniforms)
//   flatTV(mat)             a flat TV on a short stand (screen 16:9, 6.4 x 3.6, faces +z); .screen
//   seatBanks(o)            four banks of stadium seats round a square floor (InstancedMesh, thousands of seats), gaps for tunnels
//   mallRing(o)             the mall round the arena: two storefront levels with lit shop signs, balconies, columns, a dark skylight roof
//   jumbotron(mat)          a four-faced scoreboard cube hanging over the floor (each face 16 x 8.6); .screens
//   countdownDraw(x, w, h, sec, o)   draws the countdown (mm:ss) into a 2D canvas context
//   rollGate(o)             a mall security roll-down shutter across a corridor; .set(y) the bottom edge's height
//   glassShatter(scene, ev) shards bursting out of panes; ev: [{ t, c (pane centre), n (normal: the side the shards fly to), w, h, p (impact) }]; .update(t)
//   hunterHelmet(ch, o)     an original hunter mask: a black shell, a glossy white faceplate with a red visor slit and a number,
//                           a CRT screen inside. .crack(k) draws cracks, .open(t, t0) drops the faceplate in shards, .screen (mesh)
//   metalPipe()             a scaffold pipe along +z from its grip end
//   tvHouse(o)              a dark two-storey house facade (faces -x) whose windows each hold a TV; .tvs [{ mesh, k }]
//   studioSet(o)            the host's TV stage: glitter backdrop, a bulb logo, a podium, two audience rows (.seats)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { v3, rng, clamp } from './core.js';
import { Batch, surf, paint } from './kit.js';
import { canvasTex } from './props.js';

// ---------------- screens ----------------
export function screenMat(o = {}) {
  const m = new THREE.ShaderMaterial({ toneMapped: false, fog: false,
    uniforms: { rt: { value: o.rt ? o.rt.texture : null }, ui: { value: o.ui || null }, rtK: { value: o.rt ? 1 : 0 }, uiK: { value: o.ui ? 1 : 0 },
      k: { value: o.k ?? 1 }, t: { value: 0 }, noise: { value: 0 }, lines: { value: o.lines ?? 0.12 }, crop: { value: new THREE.Vector4(0, 0, 1, 1) }, tint: { value: new THREE.Color(o.tint || '#ffffff') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D rt, ui; uniform float rtK, uiK, k, t, noise, lines; uniform vec4 crop; uniform vec3 tint; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec2 uv = crop.xy + vUv * crop.zw; vec3 c = vec3(0.02);
        if (rtK > 0.0) { vec3 s = texture2D(rt, uv).rgb; s = 1.0 - exp(-s * 1.25); c = mix(c, s, rtK); }
        if (uiK > 0.0) { vec4 u = texture2D(ui, vUv); c = mix(c, u.rgb, u.a * uiK); }
        float n = h(floor(vUv * vec2(320.0, 180.0)) + floor(t * 30.0)); c = mix(c, vec3(n), noise);
        c *= 1.0 - lines * (0.5 + 0.5 * sin(vUv.y * 900.0));
        gl_FragColor = vec4(c * tint * k, 1.0); }` });
  return m;
}

export function flatTV(mat, o = {}) {
  const g = new THREE.Group(), b = new Batch(), body = paint('#121317', { roughness: 0.35, metalness: 0.4 }), st = paint('#2a2c31', { metalness: 0.7, roughness: 0.3 });
  const W = o.w ?? 6.4, H = o.h ?? 3.6;
  b.box(body, W + 0.3, H + 0.3, 0.28, 0, 0, 0, { r: 0.06 }); b.box(body, W * 0.5, H * 0.5, 0.4, 0, 0, -0.3, { r: 0.1 });
  b.box(st, 0.4, 0.9, 0.3, 0, -H / 2 - 0.45, -0.1, { r: 0.05 }); b.box(st, 2.6, 0.12, 1.2, 0, -H / 2 - 0.9, -0.05, { r: 0.05 });
  b.done(g);
  g.screen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); g.screen.position.z = 0.15; g.screen.userData.noAO = true; g.add(g.screen);
  g.base = -H / 2 - 0.96;   // the stand's foot below the screen's centre
  return g;
}

// ---------------- the arena ----------------
// rows rise from the floor's edge (d0 from the centre) outward; side s faces the centre. gaps: { '+z': 7, '-z': 7 } half-widths
export function seatBanks(o = {}) {
  const g = new THREE.Group(), rows = o.rows ?? 16, d0 = o.d0 ?? 26, step = o.step ?? 2.0, rise = o.rise ?? 1.25, sp = o.spacing ?? 1.75;
  const riser = surf('concrete', o.riser || '#4a4c55', { roughness: 0.85 }), lip = paint('#d9b23a', { roughness: 0.5 });
  const b = new Batch(), places = [];
  const sides = [['+z', 0], ['-z', Math.PI], ['+x', Math.PI / 2], ['-x', -Math.PI / 2]];
  for (const [name, ry] of sides) {
    const gap = (o.gaps || {})[name] || 0;
    for (let i = 0; i < rows; i++) {
      const d = d0 + i * step, y = 0.6 + i * rise, half = d - 0.6;
      const seg = (a, c) => { const w = c - a, m = (a + c) / 2; if (w <= 0.2) return; const p = v3(m, y / 2, d + step / 2).applyAxisAngle(v3(0, 1, 0), ry);
        b.box(riser, ry === 0 || ry === Math.PI ? w : step, y, ry === 0 || ry === Math.PI ? step : w, p.x, p.y, p.z, { r: 0.02 });
        const q = v3(m, y + 0.03, d + 0.15).applyAxisAngle(v3(0, 1, 0), ry); b.box(lip, ry === 0 || ry === Math.PI ? w : 0.18, 0.06, ry === 0 || ry === Math.PI ? 0.18 : w, q.x, q.y, q.z, { r: 0.0 }); };
      if (gap && i < (o.gapRows ?? rows)) { seg(-half, -gap); seg(gap, half); } else seg(-half, half);
      for (let x = -half + sp / 2; x < half; x += sp) { if (gap && Math.abs(x) < gap + 0.6 && i < (o.gapRows ?? rows)) continue; places.push({ p: v3(x, y, d + step * 0.55).applyAxisAngle(v3(0, 1, 0), ry), ry: ry + Math.PI, i }); }
    }
  }
  b.done(g);
  // a seat: a pan and a back, merged
  const pan = new THREE.BoxGeometry(1.35, 0.22, 1.0).translate(0, 0.95, 0), back = new THREE.BoxGeometry(1.35, 1.25, 0.18).translate(0, 1.55, -0.5).rotateX(-0.12);
  const leg = new THREE.BoxGeometry(0.16, 0.85, 0.16).translate(0, 0.42, -0.1);
  const geo = mergeGeometries([pan, back, leg].map((x) => x.toNonIndexed()));
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }), places.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), col = new THREE.Color(), cs = o.colors || ['#b0243a', '#b0243a', '#1d2433'];
  places.forEach((s, k) => { Q.setFromAxisAngle(v3(0, 1, 0), s.ry); M.compose(s.p, Q, v3(1, 1, 1)); im.setMatrixAt(k, M); col.set(cs[(s.i + Math.floor(k / 7)) % 3 === 2 ? 2 : 0]); im.setColorAt(k, col); });
  im.castShadow = false; im.receiveShadow = true; g.add(im); g.seats = places; g.count = places.length;
  return g;
}

export function shopSign(text, o = {}) {
  const t = canvasTex(512, 96, (x, w, h) => { x.fillStyle = o.bg || '#15161c'; x.fillRect(0, 0, w, h); x.fillStyle = o.fg || '#ffe6b0'; x.font = `800 ${o.size ?? 54}px ITTInter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 3); });
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: o.glow ?? 0.55, roughness: 0.6 });
}
const SHOPS = ['MOONBEAN', 'PIXEL PLAZA', 'KICKS & CO', 'TOY ATTIC', 'LUMEN', 'SODA STOP', 'GADGET HUT', 'PETAL & PINE', 'NOVA BOOKS', 'GLOW NAILS', 'BURGER BAY', 'ARC CADE'];
// a lit shop window (canvas): shelves and goods behind glass, or a dark one
export function shopWindowMat(seed, lit = true) {
  const r = rng(seed); const t = canvasTex(256, 192, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, lit ? '#f4ead2' : '#14161c'); g.addColorStop(1, lit ? '#c9b48e' : '#0a0b0e'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (lit) for (let s = 0; s < 3; s++) { const y = 40 + s * 50; x.fillStyle = '#7a6248'; x.fillRect(10, y + 30, w - 20, 5); for (let i = 0; i < 9; i++) { x.fillStyle = `hsl(${Math.floor(r() * 360)},${50 + r() * 30}%,${45 + r() * 20}%)`; x.fillRect(16 + i * 26, y + 30 - (8 + r() * 18), 16 + r() * 6, 8 + r() * 18); } }
    x.fillStyle = lit ? 'rgba(255,255,255,0.18)' : 'rgba(120,140,170,0.08)'; x.beginPath(); x.moveTo(30, 0); x.lineTo(90, 0); x.lineTo(30, h); x.lineTo(0, h); x.fill(); });
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: lit ? 0.6 : 0.05, roughness: 0.25 });
}

export function mallRing(o = {}) {
  const g = new THREE.Group(), R = o.r ?? 62, H = o.h ?? 56, b = new Batch(), r = rng(o.seed ?? 5);
  const wall = surf('concrete', '#2c2e36', { roughness: 0.8 }), slab = paint('#d9d4ca', { roughness: 0.6 }), rail = paint('#9aa3ad', { metalness: 0.7, roughness: 0.3 }), col = paint('#e8e2d6', { roughness: 0.5 });
  const dark = paint('#0b0c10', { roughness: 0.9 });
  for (let s = 0; s < 4; s++) {
    const ry = s * Math.PI / 2, P = (x, y, z) => v3(x, y, z).applyAxisAngle(v3(0, 1, 0), ry);
    const box = (m, w, h, d, x, y, z) => { const p = P(x, y, z); const sw = s % 2 === 0; b.box(m, sw ? w : d, h, sw ? d : w, p.x, p.y, p.z, { r: 0.04 }); };
    box(wall, R * 2 + 4, H, 1.0, 0, H / 2, R + 6);                    // the back wall
    for (const lv of [0, 1, 2]) {
      const y = 22 + lv * 12;
      box(slab, R * 2, 0.9, 7, 0, y, R + 2.4);                       // the balcony floor
      box(paint('#c9c2b4'), R * 2, 0.6, 0.3, 0, y + 0.1, R - 1.0);    // its lip
      for (let x = -R + 1; x < R; x += 3.2) box(rail, 0.12, 2.2, 0.12, x, y + 1.5, R - 0.9);
      box(rail, R * 2, 0.18, 0.18, 0, y + 2.6, R - 0.9);
      box(new THREE.MeshStandardMaterial({ color: '#a8c4d8', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }), R * 2, 2.2, 0.08, 0, y + 1.5, R - 0.95);
    }
    for (let x = -R + 8; x < R; x += 16) box(col, 1.6, H, 1.6, x, H / 2, R - 0.2);
  }
  b.box(dark, R * 2 + 14, 1, R * 2 + 14, 0, H, 0, { r: 0.0 });   // the roof (a dark skylight grid sits under it)
  b.done(g);
  // storefronts on each level: lit or dark windows, a sign above
  const fr = new Batch(), frame = paint('#3a3d45', { metalness: 0.5, roughness: 0.4 });
  let k = 0;
  for (let s = 0; s < 4; s++) for (const lv of [0, 1, 2]) for (let x = -R + 6; x < R - 6; x += 16) {
    const ry = s * Math.PI / 2 + Math.PI, y = 22 + lv * 12 + 0.45, lit = r() < (o.lit ?? 0.55);
    const p = v3(x + 8, y + 4.2, R + 5.4).applyAxisAngle(v3(0, 1, 0), s * Math.PI / 2);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(13, 7), shopWindowMat(k * 7 + 3, lit)); win.position.copy(p); win.rotation.y = ry; win.userData.noAO = true; g.add(win);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), shopSign(SHOPS[k % SHOPS.length], { glow: lit ? 0.7 : 0.15 })); sg.position.copy(v3(x + 8, y + 9.1, R + 5.35).applyAxisAngle(v3(0, 1, 0), s * Math.PI / 2)); sg.rotation.y = ry; g.add(sg);
    const q = v3(x + 8, y + 4.2, R + 5.3).applyAxisAngle(v3(0, 1, 0), s * Math.PI / 2); const sw = s % 2 === 0;
    fr.box(frame, sw ? 13.4 : 0.3, 0.3, sw ? 0.3 : 13.4, q.x, q.y + 3.6, q.z); fr.box(frame, sw ? 13.4 : 0.3, 0.3, sw ? 0.3 : 13.4, q.x, q.y - 3.6, q.z);
    k++;
  }
  fr.done(g);
  // the skylight: a dark grid of beams under the roof, night glass between
  const sk = new Batch(), beam = paint('#1a1c22', { metalness: 0.5, roughness: 0.5 });
  for (let i = -R; i <= R; i += 8) { sk.box(beam, 0.6, 0.8, R * 2, i, H - 1, 0); sk.box(beam, R * 2, 0.8, 0.6, 0, H - 1, i); }
  sk.done(g);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), new THREE.MeshBasicMaterial({ color: '#0d1426' })); glass.rotation.x = Math.PI / 2; glass.position.y = H - 1.5; glass.userData.noAO = true; g.add(glass);
  return g;
}

export function jumbotron(mat, o = {}) {
  const g = new THREE.Group(), b = new Batch(), body = paint('#101116', { roughness: 0.4, metalness: 0.5 }), led = paint('#c0182a', { emissive: '#ff2030', emissiveIntensity: 1.2 });
  const W = 16, H = 8.6, D = W + 1;
  b.box(body, D, H + 1.2, D, 0, 0, 0, { r: 0.2 });
  for (const y of [H / 2 + 0.75, -H / 2 - 0.75]) for (let s = 0; s < 4; s++) { const a = s * Math.PI / 2; b.box(led, D + 0.1, 0.25, 0.3, Math.sin(a) * (D / 2 - 0.1), y, Math.cos(a) * (D / 2 - 0.1), { r: 0.05, ry: a }); }   // LED strips round the rims
  for (const x of [-4, 4]) for (const z of [-4, 4]) b.cyl(paint('#2a2c31', { metalness: 0.7 }), 0.12, 0.12, 30, x, H / 2 + 15, z, { seg: 6 });
  b.done(g);
  g.screens = [];
  for (let s = 0; s < 4; s++) { const sc = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); const a = s * Math.PI / 2; sc.position.set(Math.sin(a) * (D / 2 + 0.03), 0, Math.cos(a) * (D / 2 + 0.03)); sc.rotation.y = a; sc.userData.noAO = true; g.add(sc); g.screens.push(sc); }
  return g;
}

export function countdownDraw(x, w, h, sec, o = {}) {
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
  x.fillStyle = '#07080c'; x.fillRect(0, 0, w, h);
  const s = Math.max(0, Math.ceil(sec - 1e-6)), mm = Math.floor(s / 60), ss = s % 60, red = s <= 10;
  x.fillStyle = o.label ? '#c9cede' : 'rgba(0,0,0,0)'; x.font = `800 ${Math.round(h * 0.11)}px ITTInter, sans-serif`; x.textAlign = 'center';
  if (o.label) x.fillText(o.label, w / 2, h * 0.19);
  x.fillStyle = red ? '#ff2a36' : '#ffffff'; x.font = `900 ${Math.round(h * 0.5)}px ITTInter, sans-serif`; x.textBaseline = 'middle';
  x.shadowColor = red ? '#ff0018' : '#7fb4ff'; x.shadowBlur = h * 0.04;
  x.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, w / 2, h * (o.label ? 0.6 : 0.52)); x.shadowBlur = 0; x.textBaseline = 'alphabetic';
  if (o.bar != null) { x.fillStyle = '#2a2d38'; x.fillRect(w * 0.12, h * 0.86, w * 0.76, h * 0.04); x.fillStyle = red ? '#ff2a36' : '#ffd23a'; x.fillRect(w * 0.12, h * 0.86, w * 0.76 * clamp(o.bar), h * 0.04); }
}

// ---------------- the corridor's gate ----------------
export function rollGate(o = {}) {
  const g = new THREE.Group(), W = o.w ?? 24, H = o.h ?? 13, b = new Batch(), post = paint('#5a5f66', { metalness: 0.7, roughness: 0.35 }), box = paint('#3a3d42', { metalness: 0.5 });
  for (const s of [-1, 1]) b.box(post, 0.7, H + 1, 0.9, s * (W / 2 + 0.2), (H + 1) / 2, 0, { r: 0.05 });
  b.box(box, W + 1.6, 1.6, 1.8, 0, H + 1.2, 0, { r: 0.12 }); b.box(paint('#d6b21e', { roughness: 0.5 }), W + 1.62, 0.25, 1.82, 0, H + 0.5, 0, { r: 0.03 });
  b.done(g);
  const tex = canvasTex(256, 256, (x, w, h) => { for (let i = 0; i < 16; i++) { const gr = x.createLinearGradient(0, i * 16, 0, i * 16 + 16); gr.addColorStop(0, '#c9cdd2'); gr.addColorStop(0.5, '#8d939a'); gr.addColorStop(1, '#5b6067'); x.fillStyle = gr; x.fillRect(0, i * 16, w, 16); } });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 6);
  const mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.55, roughness: 0.42, side: THREE.DoubleSide });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(W, 1).translate(0, -0.5, 0), mat); sh.castShadow = true; sh.receiveShadow = true; g.add(sh);
  const bar = new Batch(); bar.box(paint('#2a2c30', { metalness: 0.6 }), W, 0.35, 0.4, 0, 0, 0, { r: 0.06 }); bar.box(paint('#d6b21e'), W * 0.98, 0.1, 0.42, 0, -0.1, 0, { r: 0.02 }); const bt = bar.done(); g.add(bt);
  g.set = (y) => { const top = H + 0.4, len = Math.max(0.05, top - y); sh.scale.y = len; sh.position.y = top; tex.repeat.set(4, len / 2); bt.position.y = y; };
  g.set(H);
  return g;
}

// ---------------- glass ----------------
export function glassShatter(scene, events, o = {}) {
  const R = rng(o.seed ?? 17), per = o.per ?? 70, G = 30, shards = [];
  for (const e of events) {
    const n = e.n.clone().normalize(), up = v3(0, 1, 0), side = new THREE.Vector3().crossVectors(up, n).normalize();
    for (let i = 0; i < per; i++) {
      const u = (R() - 0.5) * e.w, vv = (R() - 0.5) * e.h; const p0 = e.c.clone().addScaledVector(side, u).addScaledVector(up, vv);
      const near = Math.exp(-p0.distanceTo(e.p || e.c) / 2.5);
      const v = n.clone().multiplyScalar((2 + R() * 7) * (0.5 + near) * (e.power ?? 1)).addScaledVector(side, (R() - 0.5) * 4).addScaledVector(up, R() * 3);
      if (e.push) v.addScaledVector(e.push, 0.6 + R() * 0.6);
      shards.push({ t0: e.t + near * 0.0 + R() * 0.02, p0, v, s: 0.18 + R() * 0.42, spin: v3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(18), q0: R() * 6.28 });
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.6, 0, -0.45, -0.4, 0, 0.5, -0.35, 0], 3)); geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: '#cfe6f0', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6, side: THREE.DoubleSide, emissive: '#5a7a88', emissiveIntensity: 0.4, depthWrite: false });
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, shards.length)); im.frustumCulled = false; im.userData.noAO = true; scene.add(im);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), hide = new THREE.Matrix4().makeScale(0, 0, 0), floor = o.floor ?? 0.04;
  im.update = (t) => {
    shards.forEach((s, i) => {
      const dt = t - s.t0; if (dt < 0) { im.setMatrixAt(i, hide); return; }
      const vy = s.v.y, y0 = s.p0.y - floor, tl = (vy + Math.sqrt(vy * vy + 2 * G * y0)) / G, tt = Math.min(dt, tl);
      P.copy(s.p0).addScaledVector(s.v, tt); P.y -= 0.5 * G * tt * tt;
      if (dt < tl) { E.set(s.q0 + s.spin.x * dt, s.spin.y * dt, s.spin.z * dt); } else { P.y = floor; E.set(-Math.PI / 2, s.q0, 0); }
      Q.setFromEuler(E); M.compose(P, Q, v3(s.s, s.s, s.s)); im.setMatrixAt(i, M);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  return im;
}

// ---------------- the hunters ----------------
const plateCanvas = (num) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; cv.num = num; return cv; };
function drawPlate(cv, crack, seed) {
  const x = cv.getContext('2d'), w = 512, h = 512, r = rng(seed);
  const g = x.createRadialGradient(w * 0.42, h * 0.38, 20, w / 2, h / 2, w * 0.62); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#e9e7e2'); g.addColorStop(1, '#bdbab2');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // the visor slit: a thin black band with a red glow line in it
  x.fillStyle = '#0a0a0c'; x.beginPath(); x.roundRect(w * 0.16, h * 0.4, w * 0.68, h * 0.075, 18); x.fill();
  x.fillStyle = '#ff2236'; x.shadowColor = '#ff0020'; x.shadowBlur = 16; x.fillRect(w * 0.22, h * 0.43, w * 0.56, h * 0.016); x.shadowBlur = 0;
  // the number on the brow
  x.fillStyle = '#1b1c20'; x.font = '900 92px ITTInter, sans-serif'; x.textAlign = 'center'; x.fillText(String(cv.num), w / 2, h * 0.3);
  // two thin seams down the cheeks
  x.strokeStyle = 'rgba(40,40,46,0.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(w * 0.3, h * 0.55); x.lineTo(w * 0.36, h * 0.9); x.moveTo(w * 0.7, h * 0.55); x.lineTo(w * 0.64, h * 0.9); x.stroke();
  if (crack > 0) {   // cracks from the strike point (the left cheek, where the pipe landed)
    x.strokeStyle = '#151518'; x.lineCap = 'round';
    const o0 = [w * 0.28, h * 0.52], n = Math.round(4 + crack * 10);
    for (let i = 0; i < n; i++) { let [px, py] = o0; let a = (i / n) * 6.28 + r() * 0.5; const len = (60 + r() * 260) * Math.min(1, crack * 1.4);
      x.lineWidth = 5 - 3 * (i / n); x.beginPath(); x.moveTo(px, py);
      for (let s = 0; s < 6; s++) { a += (r() - 0.5) * 0.9; px += Math.cos(a) * len / 6; py += Math.sin(a) * len / 6; x.lineTo(px, py); }
      x.stroke(); }
    x.fillStyle = '#151518'; x.beginPath(); x.arc(o0[0], o0[1], 10 + 14 * crack, 0, 7); x.fill();
  }
}
export function hunterHelmet(ch, o = {}) {
  const head = ch.head, box = new THREE.Box3();
  ch.root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
  (ch.headParts || []).forEach((m) => { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))); });
  if (box.isEmpty()) head.traverse((m) => { if (m.isMesh && m.geometry) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))); } });
  const c = box.getCenter(v3()), s = box.getSize(v3());
  // hide the avatar's own head (and its face sheet): the helmet replaces it
  (ch.headParts || []).forEach((m) => { m.visible = false; }); if (ch.faceSheet) ch.faceSheet.visible = false;
  head.traverse((m) => { if (m.isMesh && m.geometry && !(ch.headParts || []).includes(m) && m !== ch.faceSheet) { const bb = new THREE.Box3().setFromObject(m); if (bb.max.y > 0) m.visible = false; } });
  const hb = new Batch(), shell = paint('#121216', { roughness: 0.25, metalness: 0.35 }), trim = paint('#2a2b31', { roughness: 0.5, metalness: 0.5 });
  const HW = s.x * 1.16, HH = s.y * 1.12, HD = s.z * 1.14;
  hb.box(shell, HW, HH, HD, c.x, c.y + s.y * 0.04, c.z - s.z * 0.04, { r: Math.min(HW, HH) * 0.32 });
  hb.box(trim, HW * 1.02, HH * 0.12, HD * 0.9, c.x, c.y - HH * 0.42, c.z - s.z * 0.06, { r: 0.08 });   // a collar ring
  hb.box(trim, HW * 0.18, HH * 0.5, HD * 0.2, c.x + HW * 0.5, c.y, c.z, { r: 0.05 }); hb.box(trim, HW * 0.18, HH * 0.5, HD * 0.2, c.x - HW * 0.5, c.y, c.z, { r: 0.05 });   // ear pods
  const helmet = hb.done(); helmet.traverse((m) => { if (m.isMesh) m.castShadow = true; }); head.add(helmet);
  // the screen inside (behind the faceplate): a dark CRT glass; its material is set by the episode
  const scW = HW * 0.78, scH = HH * 0.62, front = c.z - s.z * 0.04 + HD / 2;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(scW, scH), new THREE.MeshBasicMaterial({ color: '#050506' })); screen.position.set(c.x, c.y + s.y * 0.02, front + 0.02); screen.userData.noAO = true; head.add(screen);
  // the faceplate: a domed shell over the front
  const cv = plateCanvas(o.number ?? 1); drawPlate(cv, 0, 3); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.18, metalness: 0.05, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.06 });
  const mg = new THREE.SphereGeometry(1, 30, 20, -Math.PI * 0.32, Math.PI * 0.64, Math.PI * 0.18, Math.PI * 0.64);
  mg.rotateY(Math.PI / 2); mg.scale(HW * 0.56, HH * 0.6, HD * 0.24);   // the dome's centre faces +z (the face)
  const plate = new THREE.Mesh(mg, pm); plate.position.set(c.x, c.y + s.y * 0.02, front - HD * 0.12); plate.castShadow = true; head.add(plate);
  // shards: the plate's pieces (each a patch of the same dome) that drop when it breaks
  const pieces = [];
  const cuts = [[-0.32, -0.08, 0.18, 0.45], [-0.08, 0.12, 0.18, 0.45], [0.12, 0.32, 0.18, 0.45], [-0.32, -0.05, 0.45, 0.82], [-0.05, 0.14, 0.45, 0.82], [0.14, 0.32, 0.45, 0.82]];
  for (const [a0, a1, b0, b1] of cuts) {
    const gg = new THREE.SphereGeometry(1, 10, 8, Math.PI * a0, Math.PI * (a1 - a0), Math.PI * b0, Math.PI * (b1 - b0)); gg.rotateY(Math.PI / 2); gg.scale(HW * 0.56, HH * 0.6, HD * 0.24);
    const m = new THREE.Mesh(gg, pm); m.visible = false; m.castShadow = true; head.add(m); m.position.copy(plate.position); pieces.push(m);
  }
  const api = { helmet, plate, screen, pieces, head, centre: v3(c.x, c.y, front), size: v3(HW, HH, HD) };
  let lastK = -1;
  api.crack = (k) => { const q = Math.round(k * 12) / 12; if (q === lastK) return; lastK = q; drawPlate(cv, q, 3); tex.needsUpdate = true; };
  // the faceplate falls off in pieces from t0 (head-local physics; pure function of t)
  api.open = (t, t0) => {
    const dt = t - t0; plate.visible = dt < 0; const R = rng(9);
    pieces.forEach((m, i) => {
      if (dt < 0) { m.visible = false; return; }
      m.visible = dt < 1.6; const vx = (R() - 0.5) * 2.2 + (i % 3 - 1) * 0.6, vz = 1.4 + R() * 1.4, vy = 0.6 + R();
      m.position.set(plate.position.x + vx * dt, plate.position.y + vy * dt - 9 * dt * dt, plate.position.z + vz * dt);
      m.rotation.set(dt * (2 + R() * 5), dt * (R() - 0.5) * 6, dt * (R() - 0.5) * 6);
    });
  };
  return api;
}

export function metalPipe(o = {}) {
  const g = new THREE.Group(), b = new Batch(), L = o.len ?? 4.6, m = paint(o.color || '#8e959c', { metalness: 0.85, roughness: 0.32 });
  b.cyl(m, 0.13, 0.13, L, 0, 0, L / 2 - 0.4, { rx: Math.PI / 2, seg: 14 });
  b.cyl(paint('#5d636a', { metalness: 0.85, roughness: 0.4 }), 0.17, 0.17, 0.35, 0, 0, L - 0.55, { rx: Math.PI / 2, seg: 14 });   // a coupler at the far end
  b.cyl(paint('#3a2a20', { roughness: 0.8 }), 0.16, 0.16, 0.7, 0, 0, -0.05, { rx: Math.PI / 2, seg: 12 });   // tape grip
  b.done(g); g.traverse((x) => { if (x.isMesh) x.castShadow = true; }); g.len = L; g.tipLocal = v3(0, 0, L - 0.4);
  return g;
}

// ---------------- the street at the end ----------------
export function tvHouse(o = {}) {
  const g = new THREE.Group(), r = rng(o.seed ?? 1), w = o.w ?? 20, h = o.h ?? 16, d = o.d ?? 16;
  const wall = surf('siding', o.wall || '#8a96a8'), trim = paint('#d8d4cc', { roughness: 0.5 }), roofM = surf('shingle', o.roof || '#3a3d46');
  const b = new Batch();
  b.box(wall, d, h, w, d / 2, h / 2, 0, { r: 0.04 });
  const roof = new THREE.CylinderGeometry(0.01, w * 0.62, 6, 4, 1).rotateY(Math.PI / 4).scale(d * 0.95 / (w * 0.62 * 1.414) * 1.414, 1, 1);
  b.add(roofM, roof, d / 2, h + 3, 0);
  b.box(trim, 0.4, 0.4, w + 0.6, -0.1, h, 0, { r: 0.05 });
  b.box(paint('#2a2622'), 0.3, 6.5, 3.4, -0.05, 3.25, w * 0.28, { r: 0.04 });   // the front door (shut)
  b.box(surf('concrete', '#6e6b66'), 4, 0.5, 5, -2, 0.25, w * 0.28, { r: 0.04 });
  const tvs = [];
  const wins = [[-w * 0.28, 3.4], [w * 0.02, 3.4], [-w * 0.28, 10.6], [w * 0.02, 10.6], [w * 0.3, 10.6]];
  for (const [z, y] of wins) {
    b.box(trim, 0.5, 4.6, 0.35, -0.12, y + 2.3, z - 1.9, { r: 0.04 }); b.box(trim, 0.5, 4.6, 0.35, -0.12, y + 2.3, z + 1.9, { r: 0.04 });
    b.box(trim, 0.6, 0.35, 4.4, -0.15, y, z, { r: 0.04 }); b.box(trim, 0.5, 0.35, 4.2, -0.12, y + 4.6, z, { r: 0.04 });
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), new THREE.MeshBasicMaterial({ color: '#06070a' })); dark.position.set(-0.03, y + 2.3, z); dark.rotation.y = -Math.PI / 2; dark.userData.noAO = true; g.add(dark);
    const tv = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), o.tvMat); tv.position.set(-0.08, y + 1.55 + r() * 0.3, z + (r() - 0.5) * 0.3); tv.rotation.y = -Math.PI / 2; tv.userData.noAO = true; g.add(tv);
    const bez = new Batch(); bez.box(paint('#0d0e11'), 0.2, 1.75, 2.85, 0.07, tv.position.y, tv.position.z, { r: 0.03 }); bez.done(g);
    tvs.push({ mesh: tv, glow: tv.position.clone() });
  }
  b.done(g); g.tvs = tvs;
  return g;
}

export function studioSet(o = {}) {
  const g = new THREE.Group(), b = new Batch();
  const floor = paint('#1a1030', { roughness: 0.2, metalness: 0.3 }), stage = paint('#2a1a4a', { roughness: 0.25, metalness: 0.4 }), gold = paint('#e0b040', { metalness: 0.85, roughness: 0.3 });
  b.box(floor, 60, 0.4, 50, 0, -0.2, 6, { r: 0.02 });
  b.cyl(stage, 9, 9.4, 0.9, 0, 0.45, 0, { seg: 40 }); b.cyl(gold, 9.45, 9.45, 0.18, 0, 0.92, 0, { seg: 40 });
  // a podium for the host
  b.box(paint('#3a1f6a', { roughness: 0.3, metalness: 0.3 }), 3.2, 3.6, 2.0, 3.4, 2.7, 0.8, { r: 0.2 }); b.box(gold, 3.4, 0.25, 2.2, 3.4, 4.55, 0.8, { r: 0.08 });
  // audience rows (facing -z, toward the stage)
  g.seats = [];
  for (let row = 0; row < 2; row++) { const z = 15 + row * 4, y = row * 1.2; b.box(paint('#251838'), 30, y + 0.4, 4, 0, (y + 0.4) / 2, z, { r: 0.04 });
    for (let i = 0; i < 6; i++) { const x = -12.5 + i * 5; b.box(paint('#8a1a3a', { roughness: 0.6 }), 2.4, 0.5, 2.0, x, y + 1.85, z, { r: 0.12 }); b.box(paint('#8a1a3a', { roughness: 0.6 }), 2.4, 2.4, 0.4, x, y + 3.0, z + 1.1, { r: 0.12 }); g.seats.push(v3(x, y + 2.1, z)); } }
  b.done(g);
  // the glitter backdrop and the bulb logo
  const back = canvasTex(1024, 512, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a0f55'); gr.addColorStop(1, '#5a1a7a'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    const r = rng(4); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(255,${200 + r() * 55},${120 + r() * 120},${0.2 + r() * 0.6})`; x.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(i * 76, 0, 30, h); } });
  back.colorSpace = THREE.SRGBColorSpace;
  const bd = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 22, 40, 1, true, Math.PI * 0.62, Math.PI * 0.76), new THREE.MeshStandardMaterial({ map: back, emissive: '#ffffff', emissiveMap: back, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.BackSide }));
  bd.position.set(0, 11, 12); g.add(bd);
  const logo = canvasTex(1024, 360, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#ffd34a'; x.strokeStyle = '#7a1020'; x.lineWidth = 14; x.font = '900 120px ITTInter, sans-serif'; x.textAlign = 'center';
    x.strokeText('THE LAST', w / 2, 140); x.fillText('THE LAST', w / 2, 140); x.fillStyle = '#ff3a4a'; x.strokeStyle = '#ffd34a'; x.strokeText('CONTESTANT', w / 2, 290); x.fillText('CONTESTANT', w / 2, 290);
    for (let i = 0; i < 26; i++) { x.fillStyle = '#fff2c0'; x.beginPath(); x.arc(30 + i * 37.5, 18, 7, 0, 7); x.fill(); x.beginPath(); x.arc(30 + i * 37.5, h - 18, 7, 0, 7); x.fill(); } });
  logo.colorSpace = THREE.SRGBColorSpace;
  const lg = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.6), new THREE.MeshBasicMaterial({ map: logo, transparent: true, color: new THREE.Color('#ffffff').multiplyScalar(1.1) })); lg.position.set(-2.5, 10.5, -11); lg.userData.noAO = true; g.add(lg);
  return g;
}
