// LIM-001 "Now Serving 4,812" (ep201): an endless pale-green waiting room. Library names wr_*.
// The hall runs from the front wall (z = 0: the frosted door and the NOW SERVING board) back along +z past where it should end.
// Chairs, vending machine, plants, bins, extinguisher, sanitiser and the kid's backpack are Polyfork models (CC BY 4.0,
// web/assets/models/pf_*); everything else is built here.
import * as THREE from 'three';
import { model } from './library.js';

export const M = 3.7;                  // studs per metre (an adult avatar is about 6.5 studs)
export const HALL = { w: 30, h: 14, len: 280, doorW: 5.2, doorH: 8.6, boardY: 11.0 };
const rnd = (s) => { let x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
function canvasTex(w, h, draw, { repeat, srgb = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };

// ---- surfaces ----
function tileTex() {   // scuffed cream vinyl tiles, 2 x 2 per texture
  return canvasTex(512, 512, (g, w, h) => {
    const base = ['#e9e2cf', '#e4dcc6', '#ece6d4', '#e1d9c2'];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = base[i * 2 + j]; g.fillRect(i * 256, j * 256, 256, 256); }
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${120 + rnd(k) * 60},${110 + rnd(k + 1) * 50},${90 + rnd(k + 2) * 40},${0.04 + rnd(k + 3) * 0.06})`; g.fillRect(rnd(k + 4) * w, rnd(k + 5) * h, 1 + rnd(k + 6) * 3, 1 + rnd(k + 7) * 3); }
    g.strokeStyle = 'rgba(70,60,45,0.25)'; g.lineWidth = 1.2;
    for (let k = 0; k < 14; k++) { g.beginPath(); const x = rnd(k + 40) * w, y = rnd(k + 41) * h; g.moveTo(x, y); g.quadraticCurveTo(x + 30 * rnd(k + 42), y + 10, x + 40 + rnd(k + 43) * 60, y + rnd(k + 44) * 14 - 7); g.stroke(); }
    g.strokeStyle = 'rgba(90,85,70,0.55)'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); g.strokeRect(256, 0, 256, 256); g.strokeRect(0, 256, 256, 256); g.strokeRect(256, 256, 256, 256);
  }, { repeat: [HALL.w / 7.4, HALL.len / 7.4] });
}
function wallTex(len) {   // pale institutional green paint: faint roller marks, a darker dado below the rail
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#b9d3bf'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(255,255,255,${0.02 + rnd(k) * 0.03})`; g.fillRect(rnd(k + 1) * w, rnd(k + 2) * h, 2 + rnd(k + 3) * 40, 1); }
    for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(40,70,50,${0.015 + rnd(k + 9) * 0.03})`; g.fillRect(rnd(k + 5) * w, rnd(k + 6) * h, 1 + rnd(k + 7) * 3, 1 + rnd(k + 8) * 6); }
    const rail = h * (1 - 3.6 / HALL.h);
    g.fillStyle = '#8fb39d'; g.fillRect(0, rail, w, h - rail);
    g.fillStyle = '#e8e4d6'; g.fillRect(0, rail - 6, w, 7);
    g.fillStyle = '#6d8f7b'; g.fillRect(0, h - 14, w, 14);
  }, { repeat: [len / 14, 1] });
}
function ceilTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ecebe4'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(120,120,110,${0.05 + rnd(k) * 0.08})`; g.fillRect(rnd(k + 1) * w, rnd(k + 2) * h, 1.5, 1.5); }
    g.strokeStyle = '#c9c7bc'; g.lineWidth = 6; g.strokeRect(0, 0, w, h);
  }, { repeat: [HALL.w / 4.4, HALL.len / 4.4] });
}

// ---- the hall ----
export function waitingHall() {
  const G = new THREE.Group(); G.name = 'wr_hall';
  const { w, h, len } = HALL;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, len), std({ map: tileTex(), roughness: 0.42, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, len / 2); floor.receiveShadow = true; G.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, len), std({ map: ceilTex(), roughness: 0.9 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, h, len / 2); G.add(ceil);
  const wt = wallTex(len), wm = std({ map: wt, roughness: 0.86 });
  for (const s of [-1, 1]) { const wl = new THREE.Mesh(new THREE.PlaneGeometry(len, h), wm); wl.rotation.y = -s * Math.PI / 2; wl.position.set(s * w / 2, h / 2, len / 2); wl.receiveShadow = true; G.add(wl); }
  // front wall with the door opening
  const fwt = wallTex(w); fwt.repeat.set(w / 14, 1);
  const fm = std({ map: fwt, roughness: 0.86 });
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h); sh.lineTo(-w / 2, h); sh.lineTo(-w / 2, 0);
  const hole = new THREE.Path(); const dw = HALL.doorW, dh = HALL.doorH; hole.moveTo(-dw / 2, 0); hole.lineTo(-dw / 2, dh); hole.lineTo(dw / 2, dh); hole.lineTo(dw / 2, 0); sh.holes.push(hole);
  const fg = new THREE.ShapeGeometry(sh); { const p = fg.attributes.position, uv = fg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / 14, p.getY(i) / h); }
  const front = new THREE.Mesh(fg, fm); front.receiveShadow = true; G.add(front);
  // skirting along the side walls and the front
  const sk = std({ color: '#5f8270', roughness: 0.6 });
  for (const s of [-1, 1]) G.add(box(0.12, 0.5, len, sk, s * (w / 2 - 0.06), 0.25, len / 2));
  // square pillars, in two rows just inside the walls, every 22
  const pil = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, h, 1.6), std({ map: wallTex(1.6), roughness: 0.85 }), 26);
  let n = 0; const mx = new THREE.Matrix4();
  for (let z = 22; z < len - 10 && n < 26; z += 22) for (const s of [-1, 1]) { mx.makeTranslation(s * (w / 2 - 3.2), h / 2, z); pil.setMatrixAt(n++, mx); }
  pil.count = n; pil.castShadow = pil.receiveShadow = true; G.add(pil);
  // fluorescent panels: a grid of emissive troffers, one dead and one flickering far back
  const pm = std({ color: '#ffffff', emissive: '#f4fbf2', emissiveIntensity: 2.4, roughness: 0.5 });
  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.12, 4.6), pm, 200); n = 0;
  const pz = [];
  for (let z = 4; z < len; z += 9) for (const x of [-7.5, 0, 7.5]) { if (n >= 200) break; mx.makeTranslation(x, h - 0.07, z); panels.setMatrixAt(n++, mx); pz.push([x, z]); }
  panels.count = n; panels.userData.noAO = true; G.add(panels);
  const frames = new THREE.InstancedMesh(new THREE.BoxGeometry(2.8, 0.1, 5.0), std({ color: '#b8b8b0', roughness: 0.6 }), 200);
  for (let i = 0; i < n; i++) { panels.getMatrixAt(i, mx); mx.elements[13] += 0.02; frames.setMatrixAt(i, mx); } frames.count = n; G.add(frames);
  // the flickering panel (separate so its brightness can change)
  const flick = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.13, 4.6), std({ color: '#d8dcd6', emissive: '#e8f4e8', emissiveIntensity: 0.3 })); flick.position.set(7.5, h - 0.08, 103); flick.userData.noAO = true; G.add(flick);
  G.flick = (t) => { const k = Math.sin(t * 13.7) * Math.sin(t * 5.3 + 1) > 0.55 ? 1.8 : 0.15; flick.material.emissiveIntensity = k; };
  G.panelZ = pz;
  // a wall clock with no hands, an exit sign, a chair rail
  const rail = std({ color: '#e8e4d6', roughness: 0.5 });
  for (const s of [-1, 1]) G.add(box(0.1, 0.18, len, rail, s * (w / 2 - 0.05), 3.6, len / 2));
  G.add(box(w, 0.6, 0.2, sk, 0, 0.3, 0.1));
  return G;
}

// ---- Polyfork chairs in joined rows (instanced). Returns the seats: [{ x, z, seatY }] by row/col ----
export function chairRows(parent, rows, { gap = 1.95, seat = '#e9a679', frame = '#8b9096', beam = '#6f747a' } = {}) {
  const src = model('pf_seminar_chair', {});
  src.updateMatrixWorld(true);
  const parts = [];
  src.traverse((o) => { if (o.isMesh && !/dressing/.test(o.name + (o.parent ? o.parent.name : ''))) parts.push(o); });
  // recolour the vertex colours: tan wood -> faded pastel orange plastic, brown frame -> steel
  const sc = new THREE.Color(seat), fc = new THREE.Color(frame);
  const geos = parts.map((o) => {
    const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    const c = g.attributes.color; if (c) {
      for (let i = 0; i < c.count; i++) { const r = c.getX(i), gg = c.getY(i), b = c.getZ(i); const l = 0.3 * r + 0.6 * gg + 0.1 * b; const tgt = l > 0.12 ? sc : fc; const v = 0.86 + 0.14 * rnd(i * 0.37); c.setXYZ(i, tgt.r * v, tgt.g * v, tgt.b * v); }
    }
    return g;
  });
  const bb = new THREE.Box3(); geos.forEach((g) => { g.computeBoundingBox(); bb.union(g.boundingBox); });
  const k = 0.8 * M / (bb.max.y - bb.min.y);      // the chair is 0.80 m tall
  geos.forEach((g) => { g.translate(0, -bb.min.y, 0); g.scale(k, k, k); g.rotateY(Math.PI); });   // faces -z (the door)
  const seatY = 0.45 * M;
  const total = rows.reduce((a, r) => a + r.n, 0);
  const mat = std({ vertexColors: true, roughness: 0.55 });
  const ims = geos.map((g) => { const im = new THREE.InstancedMesh(g, mat, total); im.castShadow = im.receiveShadow = true; parent.add(im); return im; });
  const beamGeo = new THREE.BoxGeometry(1, 0.22, 0.32), bmat = std({ color: beam, roughness: 0.45, metalness: 0.5 });
  const seats = []; let n = 0; const mx = new THREE.Matrix4();
  for (const r of rows) {
    const row = [];
    for (let i = 0; i < r.n; i++) {
      const x = r.x0 + i * gap * (r.dir || 1); mx.makeTranslation(x, 0, r.z); ims.forEach((im) => im.setMatrixAt(n, mx)); n++;
      row.push({ x, z: r.z, seatY });
    }
    const bm = new THREE.Mesh(beamGeo, bmat); const x0 = r.x0, x1 = r.x0 + (r.n - 1) * gap * (r.dir || 1);
    bm.scale.x = Math.abs(x1 - x0) + 1.2; bm.position.set((x0 + x1) / 2, 0.95, r.z + 0.25); bm.castShadow = bm.receiveShadow = true; parent.add(bm);
    seats.push(row);
  }
  ims.forEach((im) => { im.count = n; im.instanceMatrix.needsUpdate = true; });
  return { seats, seatY, depth: (bb.max.z - bb.min.z) * k };
}

// ---- the red LED board: NOW SERVING / nnnn on a dot matrix ----
export function ledBoard() {
  const G = new THREE.Group(); G.name = 'wr_board';
  const W = 6.6, H = 3.0;
  const housing = box(W + 0.5, H + 0.5, 0.6, std({ color: '#1b1c1e', roughness: 0.35, metalness: 0.4 }), 0, 0, 0); G.add(housing);
  const cw = 1024, ch = 466, cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H * 0.92), new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.6, roughness: 0.95, metalness: 0, envMapIntensity: 0 }));
  face.position.z = 0.31; G.add(face); face.userData.noAO = true;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H * 0.92), new THREE.MeshStandardMaterial({ color: '#220808', transparent: true, opacity: 0.12, roughness: 0.55, metalness: 0 }));
  glass.position.z = 0.33; G.add(glass);
  // 5x7 font for the dot matrix
  const F = { '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'], '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'], 'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    'W': ['10001', '10001', '10001', '10101', '10101', '11011', '10001'], 'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], 'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'], 'I': ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
    'G': ['01110', '10001', '10000', '10111', '10001', '10001', '01111'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
    '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'] };
  const dots = (txt, cx, cy, p, on, off, blank = []) => {
    const cols = txt.length * 6 - 1, x0 = cx - cols * p / 2;
    for (let k = 0; k < txt.length; k++) { const gl = F[txt[k]] || F[' ']; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      const lit = gl[r][c] === '1' && !blank.includes(k);
      g.fillStyle = lit ? on : off; g.beginPath(); g.arc(x0 + (k * 6 + c) * p + p / 2, cy + (r - 3.5) * p + p / 2, p * 0.38, 0, Math.PI * 2); g.fill(); } }
  };
  let last = '';
  G.set = (num, { flip = -1 } = {}) => {   // flip: index of a digit that is mid-change (drawn dark for a frame)
    const key = num + '|' + flip; if (key === last) return; last = key;
    g.fillStyle = '#070303'; g.fillRect(0, 0, cw, ch);
    dots('NOW SERVING', cw / 2, 92, 11, '#ff2a1a', '#2a0b08');
    dots(String(num), cw / 2, 300, 34, '#ff2a14', '#2c0a07', flip >= 0 ? [flip] : []);
    tex.needsUpdate = true;
  };
  G.set(4812);
  G.face = face;
  return G;
}

// ---- the frosted door: steel frame, frosted glass lit from behind, PLEASE WAIT ----
export function frostedDoor() {
  const G = new THREE.Group(); G.name = 'wr_door';
  const dw = HALL.doorW, dh = HALL.doorH, fm = std({ color: '#9aa1a3', roughness: 0.35, metalness: 0.65 });
  G.add(box(0.35, dh, 0.5, fm, -dw / 2 + 0.17, dh / 2, 0)); G.add(box(0.35, dh, 0.5, fm, dw / 2 - 0.17, dh / 2, 0)); G.add(box(dw, 0.35, 0.5, fm, 0, dh - 0.17, 0));
  const leaf = new THREE.Group(); G.add(leaf);
  const lw = dw - 0.7, lh = dh - 0.4;
  leaf.add(box(lw, 0.5, 0.18, fm, 0, 0.25, 0)); leaf.add(box(lw, 0.45, 0.18, fm, 0, lh - 0.22, 0)); leaf.add(box(0.4, lh, 0.18, fm, -lw / 2 + 0.2, lh / 2, 0)); leaf.add(box(0.4, lh, 0.18, fm, lw / 2 - 0.2, lh / 2, 0));
  const gt = canvasTex(256, 512, (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.45, h * 0.62);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#f2f7f0'); gr.addColorStop(1, '#c9d6cc'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 6000; k++) { g.fillStyle = `rgba(255,255,255,${rnd(k) * 0.08})`; g.fillRect(rnd(k + 1) * w, rnd(k + 2) * h, 1, 1); }
    g.fillStyle = 'rgba(70,80,74,0.72)'; g.font = '700 30px ITTInter, Arial'; g.textAlign = 'center'; g.fillText('PLEASE  WAIT', w / 2, h * 0.36);
    g.fillStyle = 'rgba(70,80,74,0.35)'; g.fillRect(w * 0.22, h * 0.36 + 12, w * 0.56, 3);
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.8, lh - 0.95), new THREE.MeshStandardMaterial({ color: '#dfe9e2', emissive: '#ffffff', emissiveMap: gt, emissiveIntensity: 1.15, roughness: 0.6, metalness: 0 }));
  glass.position.set(0, lh / 2 + 0.03, 0.01); leaf.add(glass); glass.userData.noAO = true; G.glass = glass;
  const bar = box(lw - 1.0, 0.16, 0.16, std({ color: '#c6cbcc', roughness: 0.25, metalness: 0.85 }), 0, 3.8, 0.2); leaf.add(bar);
  leaf.position.set(0, 0.1, 0);
  // a warm-white light behind the glass spills onto the floor
  return G;
}

// ---- a paper ticket (seed: each one creased differently) ----
export function ticket(num = 4813, seed = 1, { w = 0.95, h = 0.62 } = {}) {
  const t = canvasTex(384, 252, (g, W, H) => {
    g.fillStyle = '#f3ecd9'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 1400; k++) { g.fillStyle = `rgba(120,100,70,${rnd(k + seed * 31) * 0.06})`; g.fillRect(rnd(k + 1 + seed) * W, rnd(k + 2 + seed) * H, 1.5, 1.5); }
    g.fillStyle = '#c8331f'; g.fillRect(0, 0, W, 34);
    g.fillStyle = '#fff3e8'; g.font = '800 20px ITTInter, Arial'; g.textAlign = 'center'; g.fillText('PLEASE TAKE A NUMBER', W / 2, 24);
    g.fillStyle = '#1d1a17'; g.font = '900 140px ITTInter, Arial'; g.fillText(String(num), W / 2, 190);
    g.fillStyle = 'rgba(29,26,23,0.65)'; g.font = '700 16px ITTInter, Arial'; g.fillText('WAIT UNTIL YOUR NUMBER IS CALLED', W / 2, 228);
    // creases and wear, different per ticket
    g.strokeStyle = 'rgba(90,70,40,0.28)'; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { g.beginPath(); const x = (0.2 + rnd(seed * 7 + k) * 0.6) * W; g.moveTo(x + rnd(seed + k) * 30 - 15, 0); g.lineTo(x + rnd(seed * 3 + k) * 30 - 15, H); g.stroke(); }
    g.beginPath(); g.moveTo(0, H * (0.4 + rnd(seed * 5) * 0.3)); g.lineTo(W, H * (0.35 + rnd(seed * 9) * 0.3)); g.stroke();
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(110,80,40,0.22)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e8dfc6'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(W, (k + 0.5) * H / 9, 4, 0, Math.PI * 2); g.fill(); }   // the torn perforation
  });
  const geo = new THREE.PlaneGeometry(w, h, 12, 4);
  { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin((x / w + 0.5) * Math.PI) * 0.05 * (0.6 + rnd(seed)) + (Math.abs(x - (rnd(seed * 2) - 0.5) * w * 0.5) < 0.05 ? 0.02 : 0) + y * 0.02 * (rnd(seed * 4) - 0.5)); } geo.computeVertexNormals(); }
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide }));
  m.castShadow = true; m.name = 'wr_ticket';
  return m;
}

// ---- the ticket dispenser on its post ----
export function dispenser() {
  const G = new THREE.Group(); G.name = 'wr_dispenser';
  const red = std({ color: '#c42a1c', roughness: 0.4 }), steel = std({ color: '#a8adb0', roughness: 0.3, metalness: 0.8 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.4, 16), steel); post.position.y = 2.2; post.castShadow = true; G.add(post);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.18, 24), steel); base.position.y = 0.09; base.castShadow = base.receiveShadow = true; G.add(base);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.1, 24), red); head.rotation.z = Math.PI / 2; head.position.set(0, 4.75, 0); head.castShadow = true; G.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.64, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), red); nose.rotation.x = Math.PI / 2; nose.position.set(0, 4.75, 0.02); nose.scale.set(1, 0.55, 1); G.add(nose);
  const tab = ticket(4814, 9, { w: 0.42, h: 0.3 }); tab.rotation.x = -Math.PI / 2 + 0.25; tab.position.set(0, 4.42, 0.55); G.add(tab);
  const sign = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#c42a1c'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 34px ITTInter, Arial'; g.textAlign = 'center'; g.fillText('TAKE A', w / 2, 52); g.fillText('NUMBER', w / 2, 96); });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), std({ map: sign, roughness: 0.6 })); sg.position.set(0, 5.75, 0); G.add(sg);
  const sp = box(0.06, 0.5, 0.06, steel, 0, 5.35, 0); G.add(sp);
  return G;
}

// ---- the scarf: a flat striped ribbon along a path on the floor (y ~ 0.05) up to the knitter's hands ----
export function scarf(points, { width = 0.75, stripes = ['#c44b3a', '#e8c35a', '#4f7fae', '#e9e0cd', '#6aa36a'], stripeLen = 0.55 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const L = curve.getLength(), N = Math.max(40, Math.round(L / 0.35));
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    let side = new THREE.Vector3(-tg.z, 0, tg.x); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
    const wob = Math.sin(u * L * 0.9) * 0.08;
    for (const s of [-1, 1]) { const q = p.clone().addScaledVector(side, s * width / 2); q.y += 0.02 + wob * 0.2 + (s > 0 ? 0.015 : 0); pos.push(q.x, q.y, q.z); uv.push(s > 0 ? 1 : 0, u * L / stripeLen); }
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const tex = canvasTex(64, 64 * stripes.length, (c, w, h) => {
    stripes.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * 64, w, 64); });
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { c.fillStyle = `rgba(0,0,0,${0.08 + ((x + y) % 8 ? 0 : 0.06)})`; c.fillRect(x, y, 2, 3); }   // knit texture
  }, { repeat: [1, 1 / stripes.length] });
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
  m.receiveShadow = true; m.castShadow = true; m.name = 'wr_scarf';
  return m;
}
export function needles() {
  const G = new THREE.Group(); const m = std({ color: '#d9c08a', roughness: 0.4 });
  for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), m); n.rotation.z = s * 0.5 + Math.PI / 2; n.rotation.y = 0.3 * s; G.add(n); }
  return G;
}
// ---- a dry string mop (no water, no shine) ----
export function mop() {
  const G = new THREE.Group(); G.name = 'wr_mop';
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.2, 10), std({ color: '#c9b48a', roughness: 0.7 })); st.position.y = 2.6; st.castShadow = true; G.add(st);
  const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.3, 12), std({ color: '#3d6fa8', roughness: 0.5 })); cl.position.y = 0.42; G.add(cl);
  const sm = std({ color: '#d8d2c2', roughness: 1.0 });
  const strands = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.03, 0.62, 5), sm, 46); const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 46; i++) { const a = i * 2.4, r = 0.08 + rnd(i) * 0.12; e.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9); q.setFromEuler(e); mx.compose(new THREE.Vector3(Math.cos(a) * r + Math.cos(a) * 0.18, 0.18, Math.sin(a) * r + Math.sin(a) * 0.18), q, new THREE.Vector3(1, 1, 1)); strands.setMatrixAt(i, mx); }
  strands.castShadow = true; G.add(strands);
  G.top = 5.2;
  return G;
}
// a cartoon patch for the kid's backpack (a smiling star)
export function patch() {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffd23f'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 26 : 58; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + 6 + Math.sin(a) * r); } g.closePath(); g.fill();
    g.strokeStyle = '#7a4a10'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#3a2410'; g.beginPath(); g.arc(w / 2 - 10, h / 2 + 2, 5, 0, 7); g.arc(w / 2 + 10, h / 2 + 2, 5, 0, 7); g.fill();
    g.beginPath(); g.arc(w / 2, h / 2 + 12, 10, 0.2, Math.PI - 0.2); g.stroke();
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.5, roughness: 0.8 }));
  return m;
}
