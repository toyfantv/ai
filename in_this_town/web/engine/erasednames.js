// The Town That Erased Its Names (Flower Man remake 2): Gullhaven, a bright harbour town where every spring everyone picks a new name,
// chalked on a slate they wear; the founder's name is chiseled off the fountain; and every spring, the morning after, a man in a tall hat
// knocks on every door. The town was hiding from one bill.
//   gullhaven()        the harbour plaza (centre at the origin): cobbles, the fountain with the founder's plinth (.plaque, .statueAt),
//                      the mayor's podium (.podium, .poster), the chalk stall (.stall), bunting, a NAME DAY banner, cottages on three
//                      sides (.cots: [{ c, at, yaw }], each cottage's door is hinged on its right, opening outward: .door.rotation.y),
//                      the quay at z = QZ with moored boats (.boats) and the sea (.water)
//   hargreaveHome()    Tilly's kitchen and front hall (a room open to +z): door in the +x wall (.door, hinged on the -z side, opens
//                      inward), the founder's portrait (.portrait), stove (.stove), table (.table), the porch and street outside
//   slate(o)           a chalk slate: .set(text, { write, wipe, old }) redraws it (write: how much of text is chalked; wipe: how much
//                      of it is smeared off, left to right); wearSlate(c, text) hangs one on a character's chest (returns the slate)
//   topHat(c, col)     a tall hat worn on the head; ledger() (.open(k), .page); billScroll() (.unroll(k)); teapot(); chalk();
//   hammer(), chisel(), boat(col, name), wearHatBig(c) (the founder's big feathered hat), wearSash(c, text)
import * as THREE from 'three';
import { v3, rng, clamp, lerp } from './core.js';
import { Batch, surf, paint, lamp, sign } from './kit.js';
import { canvasTex } from './props.js';
import { cottage, picket, flowers } from './pastel.js';
import { snRoom } from './shufflenight.js';
import { bayWater, WATER } from './merrowbay.js';

const shadowAll = (g) => { g.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent)) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } }); return g; };
function flat(mat, w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position, uv = g.attributes.uv, sp = mat.userData.span || 8;
  for (let i = 0; i < P.count; i++) uv.setXY(i, (P.getX(i) + x) / sp, (P.getZ(i) + z) / sp);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
const WHITE = () => paint('#fffaf2', { roughness: 0.5 });
export const QZ = 34;                    // the quay edge
export const FOUNT = v3(0, 0, -4);       // the fountain centre
export const PODIUM = v3(19, 0, 6);      // the mayor's stage centre
export const STALL = v3(-19, 0, 4);      // the chalk stall
const CHALKFONT = (s) => `700 ${s}px "Segoe Print", "Comic Sans MS", "Chalkboard", cursive`;

// ---------------- the slate ----------------
export function slate(o = {}) {
  const W = 512, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const w = o.w ?? 1.5, h = w * H / W, g = new THREE.Group(), b = new Batch(), wood = paint(o.frame || '#b7834f', { roughness: 0.7 });
  b.box(wood, w + 0.16, 0.09, 0.07, 0, h / 2 + 0.04, 0, { r: 0.02 }); b.box(wood, w + 0.16, 0.09, 0.07, 0, -h / 2 - 0.04, 0, { r: 0.02 });
  b.box(wood, 0.09, h + 0.16, 0.07, w / 2 + 0.04, 0, 0, { r: 0.02 }); b.box(wood, 0.09, h + 0.16, 0.07, -w / 2 - 0.04, 0, 0, { r: 0.02 });
  b.box(paint('#2a2f2c', { roughness: 0.9 }), w, h, 0.03, 0, 0, -0.02, { r: 0.005 }); b.done(g);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 })); face.position.z = 0.005; g.add(face); g.face = face;
  let key = '';
  g.set = (text, s = {}) => {
    const write = s.write ?? 1, wipe = s.wipe ?? 0, old = s.old || '', k = [text, write.toFixed(3), wipe.toFixed(3), old].join('|');
    if (k === key) return; key = k;
    const r = rng(9); x.fillStyle = '#2d3530'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(230,235,230,${0.025 + r() * 0.04})`; x.beginPath(); x.ellipse(r() * W, r() * H, 20 + r() * 60, 6 + r() * 16, r() * 3, 0, 7); x.fill(); }
    const chalk = (t, k2, ghost = 1) => { if (!t || k2 <= 0) return; let fs = 150; x.font = CHALKFONT(fs); while (x.measureText(t).width > W - 50 && fs > 50) { fs -= 6; x.font = CHALKFONT(fs); }
      const tw = x.measureText(t).width, x0 = (W - tw) / 2; x.save(); x.beginPath(); x.rect(0, 0, x0 + tw * clamp(k2) + 4, H); x.clip();
      x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = `rgba(250,250,244,${0.95 * ghost})`; x.fillText(t, x0, H / 2 + 6);
      x.globalCompositeOperation = 'destination-out'; const rr = rng(t.length * 7 + 1); for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(0,0,0,${0.25 + rr() * 0.4})`; x.fillRect(x0 + rr() * tw, H / 2 - fs * 0.5 + rr() * fs, 2 + rr() * 4, 2); } x.restore(); };
    if (old) chalk(old, 1, 0.16);   // the ghost of last year's name
    chalk(text, write);
    if (wipe > 0) {   // a thumb's smear, left to right: slate colour with a chalky haze over it
      const xr = W * clamp(wipe) * 1.1; const gr = x.createLinearGradient(Math.max(0, xr - 80), 0, xr, 0); gr.addColorStop(0, 'rgba(48,56,51,1)'); gr.addColorStop(1, 'rgba(48,56,51,0)');
      x.fillStyle = 'rgba(48,56,51,1)'; x.fillRect(0, 0, Math.max(0, xr - 80), H); x.fillStyle = gr; x.fillRect(Math.max(0, xr - 80), 0, 80, H);
      x.fillStyle = 'rgba(220,226,220,0.13)'; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(Math.min(xr, W) * (0.15 + i * 0.18), H / 2 + (i % 2 ? 26 : -18), 70, 30, 0.1, 0, 7); x.fill(); }
    }
    tex.needsUpdate = true;
  };
  g.set(o.text || '');
  return shadowAll(g);
}
function partBox(group, skip = []) { group.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(group.matrixWorld).invert(), bx = new THREE.Box3(), tmp = new THREE.Box3(); const under = (k) => { for (let q = k; q && q !== group; q = q.parent) if (skip.includes(q)) return true; return false; }; group.traverse((k) => { if (k.isMesh && !k.userData.worn && k !== group && !under(k)) { k.geometry.computeBoundingBox(); tmp.copy(k.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, k.matrixWorld)); bx.union(tmp); } }); return bx; }
const worn = (g) => { g.traverse((o) => { if (o.isMesh) { o.userData.worn = true; o.castShadow = true; } }); return g; };
const torsoBox = (c) => { const r = c.root.rotation.clone(); c.root.rotation.set(0, 0, 0); const b = partBox(c.torso, [c.head, c.neck, ...(c.arms || []), ...(c.legs || [])].filter(Boolean)); c.root.rotation.copy(r); return b; };
const headBox = (c) => { const r = c.root.rotation.clone(); c.root.rotation.set(0, 0, 0); const b = partBox(c.head); c.root.rotation.copy(r); return b; };
export function wearSlate(c, text, o = {}) {
  const B = torsoBox(c), tw = B.max.x - B.min.x, s = slate({ w: tw * (o.w ?? 0.62), text });
  s.position.set((B.min.x + B.max.x) / 2, B.max.y - (B.max.y - B.min.y) * (o.y ?? 0.36), B.max.z + 0.07); c.torso.add(worn(s));
  const cord = paint('#e8dcc2', { roughness: 0.9 }), cb = new Batch(), sw = tw * (o.w ?? 0.62);
  for (const sd of [-1, 1]) { const a = v3(sd * sw * 0.42, (B.max.y - B.min.y) * (o.y ?? 0.36) - sw * 0.2, 0), top = v3(sd * tw * 0.2, (B.max.y - B.min.y) * (o.y ?? 0.36) + 0.05, -0.05); const m = a.clone().add(top).multiplyScalar(0.5), len = a.distanceTo(top); const geo = new THREE.CylinderGeometry(0.025, 0.025, len, 5); const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), top.clone().sub(a).normalize()); geo.applyQuaternion(q); cb.add(cord, geo, m.x, m.y, m.z); }
  const cg = cb.done(); cg.position.copy(s.position); c.torso.add(worn(cg)); s.cord = cg;
  return s;
}

// ---------------- worn ----------------
export function topHat(c, col = '#2a2230', band = '#7b3f8a') {
  const B = headBox(c), w = B.max.x - B.min.x, d = B.max.z - B.min.z, g = new THREE.Group(), b = new Batch(), m = paint(col, { roughness: 0.55 }), bm = paint(band, { roughness: 0.5 });
  const R = Math.max(w, d) * 0.43, Hh = R * 2.3;
  b.cyl(m, R * 1.02, R, Hh, 0, Hh / 2 + 0.12, 0, { seg: 28 }); b.cyl(bm, R * 1.015, R * 1.015, Hh * 0.18, 0, 0.12 + Hh * 0.12, 0, { seg: 28 });
  b.add(m, new THREE.CylinderGeometry(R * 1.75, R * 1.75, 0.09, 32).scale(1, 1, 0.9), 0, 0.12, 0); b.done(g);
  g.position.set((B.min.x + B.max.x) / 2, B.max.y - (B.max.y - B.min.y) * 0.1, (B.min.z + B.max.z) / 2 - 0.03); g.rotation.x = -0.06; c.head.add(worn(g)); g.base = g.position.clone();
  return g;
}
export function wearHatBig(c, col = '#6a3a5a') {   // the founder's wide hat with a feather
  const B = headBox(c), w = B.max.x - B.min.x, g = new THREE.Group(), b = new Batch(), m = paint(col, { roughness: 0.7 });
  b.cyl(m, w * 0.42, w * 0.5, w * 0.42, 0, w * 0.21, 0, { seg: 24 }); b.add(m, new THREE.CylinderGeometry(w * 1.05, w * 1.05, 0.08, 32), 0, 0.02, 0);
  b.cyl(paint('#f2e3c4', { roughness: 0.6 }), w * 0.505, w * 0.505, w * 0.1, 0, w * 0.07, 0, { seg: 24 });
  b.add(paint('#f4f0e6', { roughness: 0.8 }), new THREE.SphereGeometry(w * 0.16, 10, 8).scale(0.6, 2.4, 0.5), w * 0.38, w * 0.48, -w * 0.1, 0, 0, -0.5); b.done(g);
  g.position.set((B.min.x + B.max.x) / 2, B.max.y - (B.max.y - B.min.y) * 0.12, (B.min.z + B.max.z) / 2 - 0.05); c.head.add(worn(g)); return g;
}
export function wearSash(c, col = '#d9363e') {
  const B = torsoBox(c), w = B.max.x - B.min.x, h = B.max.y - B.min.y, d = B.max.z - B.min.z, g = new THREE.Group(), b = new Batch(), m = paint(col, { roughness: 0.6 });
  b.box(m, w * 0.28, Math.hypot(w, h) * 0.98, d * 1.08, 0, 0, 0, { rz: Math.atan2(w, h) * 0.95, r: 0.03 });
  b.add(paint('#f5c23a', { metalness: 0.8, roughness: 0.3 }), new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16).rotateX(Math.PI / 2), -w * 0.16, -h * 0.14, d / 2 + 0.06);
  b.done(g); g.position.set((B.min.x + B.max.x) / 2, (B.min.y + B.max.y) / 2, (B.min.z + B.max.z) / 2); c.torso.add(worn(g)); return g;
}

// ---------------- props ----------------
export function chalk() { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 8), paint('#fbfbf4', { roughness: 0.95 })); m.castShadow = true; return m; }
export function teapot() {
  const g = new THREE.Group(), b = new Batch(), m = paint('#f6f1e6', { roughness: 0.25 }), blue = paint('#3f7fd0', { roughness: 0.3 });
  b.add(m, new THREE.SphereGeometry(0.55, 20, 14).scale(1, 0.82, 1), 0, 0.45, 0); b.cyl(blue, 0.56, 0.56, 0.1, 0, 0.42, 0, { seg: 20 });
  b.cyl(m, 0.08, 0.14, 0.62, 0.62, 0.62, 0, { rz: -0.9, seg: 8 }); b.add(m, new THREE.TorusGeometry(0.26, 0.06, 6, 14, Math.PI * 1.2), -0.58, 0.5, 0, 0, 0, 1.2);
  b.cyl(m, 0.24, 0.3, 0.12, 0, 0.9, 0, { seg: 14 }); b.add(blue, new THREE.SphereGeometry(0.08, 8, 6), 0, 1.0, 0); b.done(g);
  return shadowAll(g);
}
export function hammer() { const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#a8743f', { roughness: 0.6 }), 0.06, 0.07, 1.1, 0, 0, 0, { seg: 8 }); b.box(paint('#5d6068', { metalness: 0.8, roughness: 0.35 }), 0.5, 0.2, 0.2, 0, 0.55, 0, { r: 0.03 }); b.done(g); return shadowAll(g); }
export function chisel() { const g = new THREE.Group(), b = new Batch(); b.cyl(paint('#c9ced3', { metalness: 0.85, roughness: 0.3 }), 0.04, 0.05, 0.8, 0, 0, 0, { seg: 8 }); b.cyl(paint('#a8743f'), 0.07, 0.07, 0.3, 0, 0.5, 0, { seg: 8 }); b.done(g); return shadowAll(g); }
const PAGE = (draw) => canvasTex(512, 640, draw);
export function ledger() {
  const g = new THREE.Group(), cover = paint('#5a2a3a', { roughness: 0.6 }), W = 1.5, D = 1.9, T = 0.38;
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), cover); g.add(back);
  const block = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, T, D - 0.1), paint('#efe4c8', { roughness: 0.85 })); block.position.y = T / 2; g.add(block);
  const lid = new THREE.Group(); lid.position.set(-W / 2, T + 0.03, 0); g.add(lid);
  const lm = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, D), cover); lm.position.x = W / 2; lid.add(lm);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.7, D * 0.3), new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.4, map: canvasTex(256, 120, (x, w, h) => { x.fillStyle = '#c9a24a'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a1a22'; x.font = '900 46px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ACCOUNTS', w / 2, h / 2 + 3); }) }));
  label.rotation.x = -Math.PI / 2; label.position.set(W / 2, 0.035, 0); lid.add(label);
  // the open spread: the left page (inside the lid) and the right page (on the block)
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, D - 0.14), new THREE.MeshStandardMaterial({ roughness: 0.85, map: PAGE((x, w, h) => { x.fillStyle = '#f4ead2'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a2a1a'; x.font = '700 30px "Segoe Script", cursive'; const r = rng(3); const N = ['Pemberly', 'Oakes', 'Fitch', 'Dunmore', 'Quill', 'Abernathy', 'Hobb', 'Lark', 'Vane', 'Mott', 'Sowerby', 'Crane']; for (let i = 0; i < 12; i++) { x.fillText(N[i] + '  ....  ' + (10 + Math.floor(r() * 90)) + ' gn.', 30, 60 + i * 46); x.strokeStyle = 'rgba(60,40,20,0.7)'; x.lineWidth = 3; x.beginPath(); x.moveTo(26, 50 + i * 46); x.lineTo(30 + 280 + r() * 120, 52 + i * 46); x.stroke(); } }) }));
  pl.rotation.x = Math.PI / 2; pl.position.set(W / 2, -0.035, 0); lid.add(pl);
  const pr = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, D - 0.14), new THREE.MeshStandardMaterial({ roughness: 0.85, map: PAGE((x, w, h) => {
    x.fillStyle = '#f4ead2'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a2a1a'; x.textAlign = 'center';
    x.font = '700 40px "Segoe Script", cursive'; x.fillText('M. Hargreave', w / 2, 90); x.font = '600 28px "Segoe Script", cursive';
    ['every house ....... 212', 'every street ........ 9', 'every boat ......... 40', 'the harbour ......... 1'].forEach((l, i) => x.fillText(l, w / 2, 170 + i * 52));
    x.fillText('paid back:  ______', w / 2, 400);
    x.save(); x.translate(w / 2, 520); x.rotate(-0.18); x.strokeStyle = '#d0302f'; x.lineWidth = 9; x.strokeRect(-170, -48, 340, 96); x.fillStyle = '#d0302f'; x.font = '900 70px ITTInter, sans-serif'; x.textBaseline = 'middle'; x.fillText('UNPAID', 0, 4); x.restore();
  }) }));
  pr.rotation.x = -Math.PI / 2; pr.position.set(0, T + 0.005, 0); g.add(pr); g.page = pr;
  g.open = (k) => { lid.rotation.z = Math.PI * 0.97 * clamp(k); };
  g.open(0); g.size = { W, D, T };
  return shadowAll(g);
}
export function billScroll() {   // unrolls along local -z from the hand at the origin; .unroll(k) 0..1 of LEN
  const g = new THREE.Group(), LEN = 14, w = 1.4;
  const tex = canvasTex(256, 2048, (x, W, H) => { x.fillStyle = '#f8f1dc'; x.fillRect(0, 0, W, H); x.fillStyle = '#3a2a1a'; x.textAlign = 'center'; x.font = '900 34px ITTInter, sans-serif'; x.fillText('BILL', W / 2, 60); x.font = '600 18px ITTInter, sans-serif';
    const r = rng(12); for (let i = 0; i < 70; i++) { x.textAlign = 'left'; x.fillText(['interest', 'houses', 'boats', 'interest', 'streets', 'late fee', 'interest'][i % 7], 20, 110 + i * 26); x.textAlign = 'right'; x.fillText((100 + Math.floor(r() * 9000)) + '', W - 20, 110 + i * 26); }
    x.textAlign = 'center'; x.fillStyle = '#d0302f'; x.font = '900 30px ITTInter, sans-serif'; x.fillText('TOTAL:', W / 2, H - 120); x.fillText('GULLHAVEN x 3', W / 2, H - 76); });
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide })); sheet.rotation.x = -Math.PI / 2; g.add(sheet);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, w + 0.06, 14), paint('#efe4c8', { roughness: 0.8 })); roll.rotation.z = Math.PI / 2; g.add(roll);
  g.unroll = (k) => { const L = Math.max(0.05, LEN * clamp(k)); sheet.scale.y = L; sheet.position.z = -L / 2; roll.position.z = -L; roll.position.y = 0.16 * (1 - k * 0.5); tex.repeat.set(1, L / LEN); tex.offset.set(0, 1 - L / LEN); };
  g.unroll(0); g.LEN = LEN;
  return shadowAll(g);
}
export function boat(col = '#e8433a', name = 'PERCH') {
  const g = new THREE.Group(), b = new Batch(), hull = paint(col, { roughness: 0.45 }), wht = WHITE(), wood = surf('plank', '#c49662');
  const shp = new THREE.Shape(); shp.moveTo(-6, 0); shp.lineTo(5, 0); shp.quadraticCurveTo(7.6, 0, 8.4, 1.6); shp.lineTo(8.4, 2.4); shp.lineTo(-6.4, 2.4); shp.lineTo(-6.4, 0.6); shp.lineTo(-6, 0);
  const hg = new THREE.ExtrudeGeometry(shp, { depth: 4.4, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.25, bevelSegments: 2 }); hg.translate(0, -1.2, -2.2); b.add(hull, hg, 0, 0, 0);
  b.box(wht, 15, 0.3, 4.9, 0.9, 1.3, 0, { r: 0.1 }); b.box(wood, 13, 0.2, 4.1, 0.6, 1.1, 0, { r: 0.05 });
  b.box(wht, 4, 3, 3.2, -2.5, 2.7, 0, { r: 0.2 }); b.box(paint('#2f5270', { roughness: 0.12, metalness: 0.3 }), 4.1, 1.0, 2.6, -2.5, 3.2, 0, { r: 0.1 }); b.box(paint(col, { roughness: 0.4 }), 4.6, 0.3, 3.8, -2.5, 4.3, 0, { r: 0.1 });
  b.cyl(paint('#f4efe4'), 0.12, 0.15, 7, 2.5, 4.8, 0, { seg: 8 });
  b.done(g);
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.7), new THREE.MeshStandardMaterial({ roughness: 0.5, transparent: true, map: canvasTex(256, 56, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.font = '900 40px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, w / 2, h / 2 + 2); }) }));
  nm.position.set(-3.6, 0.4, 2.47); g.add(nm);
  return shadowAll(g);
}
function bunting(parent, segs, cols = ['#ff5a6e', '#ffd23f', '#3fb7e8', '#7ad06a', '#ffffff', '#b07aff']) {
  const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 }), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.45, 0, 0, 0.45, 0, 0, 0, -1.0, 0], 3)); geo.computeVertexNormals();
  const pts = [], dirs = []; for (const [A, B, sag] of segs) { const n = Math.round(A.distanceTo(B) / 1.3); for (let i = 1; i < n; i++) { const u = i / n, p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * sag; pts.push(p); dirs.push(Math.atan2(B.x - A.x, B.z - A.z) - Math.PI / 2); } }
  const im = new THREE.InstancedMesh(geo, m, pts.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  pts.forEach((p, i) => { q.setFromEuler(new THREE.Euler(0, dirs[i], 0)); M.compose(p, q, v3(1, 1, 1)); im.setMatrixAt(i, M); im.setColorAt(i, c.set(cols[i % cols.length])); });
  im.instanceColor.needsUpdate = true; im.castShadow = true; parent.add(im);
  const lm = paint('#f4efe4'); for (const [A, B, sag] of segs) { const pts2 = []; for (let i = 0; i <= 16; i++) { const u = i / 16, p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * sag; pts2.push(p); } parent.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2), 24, 0.04, 4), lm)); }
}
export function plaqueTex(scratch = 1) {
  return canvasTex(512, 300, (x, W, H) => {
    const gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#d6b25a'); gr.addColorStop(1, '#a8823a'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#7a5a22'; x.lineWidth = 10; x.strokeRect(10, 10, W - 20, H - 20); x.fillStyle = '#5a3e12'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '900 46px ITTInter, sans-serif'; x.fillText('GULLHAVEN', W / 2, 62); x.font = '700 30px ITTInter, sans-serif'; x.fillText('FOUNDED BY', W / 2, 112);
    if (scratch < 1) { x.font = '900 48px ITTInter, sans-serif'; x.fillText('M. HARGREAVE', W / 2, 172); }
    if (scratch > 0) { const r = rng(5); x.save(); x.beginPath(); x.rect(60, 140, (W - 120) * clamp(scratch), 66); x.clip(); x.fillStyle = '#8a6a2a'; x.fillRect(60, 140, W - 120, 66);
      x.strokeStyle = '#4a3410'; x.lineCap = 'round'; for (let i = 0; i < 46; i++) { x.lineWidth = 2 + r() * 5; x.beginPath(); const a = 66 + r() * (W - 140), yy = 142 + r() * 60; x.moveTo(a, yy); x.lineTo(a + 20 + r() * 40, yy + (r() - 0.5) * 30); x.stroke(); }
      x.strokeStyle = '#e8cf8a'; for (let i = 0; i < 26; i++) { x.lineWidth = 1.5; x.beginPath(); const a = 66 + r() * (W - 140), yy = 144 + r() * 56; x.moveTo(a, yy); x.lineTo(a + 14 + r() * 30, yy + (r() - 0.5) * 20); x.stroke(); } x.restore(); }
    x.font = '700 30px ITTInter, sans-serif'; x.fillText('1925', W / 2, 248);
  });
}

// ---------------- the plaza ----------------
export function gullhaven() {
  const g = new THREE.Group(), b = new Batch(), r = rng(202);
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14;
  g.add(flat(grass, 1400, 1400, 0, -0.05, QZ - 700));
  const cob = surf('cobble', '#e2d6c2'); g.add(flat(cob, 132, 90, 0, 0.02, QZ - 45));
  // the quay wall, its capstones, bollards
  b.box(paint('#b9ad99', { roughness: 0.85 }), 420, 8, 2, 0, -3.9, QZ + 0.9, { r: 0.2 }); b.box(paint('#d8cdb8', { roughness: 0.7 }), 420, 0.5, 1.8, 0, 0.2, QZ + 0.6, { r: 0.1 });
  for (let x = -60; x <= 60; x += 12) { b.cyl(paint('#3a4552', { metalness: 0.5, roughness: 0.4 }), 0.45, 0.55, 1.1, x, 0.75, QZ - 0.4, { seg: 14 }); b.add(paint('#3a4552', { metalness: 0.5 }), new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, 1.3, QZ - 0.4); }
  const water = bayWater(); water.position.y = WATER; g.add(water); g.water = water;
  // boats
  g.boats = [];
  [['#e8433a', 'PERCH', -38, 44, 0.1], ['#3d8fe0', 'MAYBE', -10, 47, -0.06], ['#ffd23f', 'NOBODY', 22, 44, 0.08], ['#5fbf57', 'WHO?', 52, 46, -0.1]].forEach(([c, n, x, z, yaw]) => { const bt = boat(c, n); bt.position.set(x, WATER + 1.0, z); bt.rotation.y = yaw; bt.userData.base = bt.position.clone(); g.add(bt); g.boats.push(bt); });
  // the fountain: basin, water, the founder's plinth with its plaque (the statue is a character, placed by the director)
  { const F = FOUNT, st = surf('stucco', '#ede4d2'), dk = paint('#cfc3ad', { roughness: 0.75 });
    b.cyl(st, 7.2, 7.6, 1.6, F.x, 0.8, F.z, { seg: 48 }); b.cyl(dk, 7.4, 7.4, 0.3, F.x, 1.65, F.z, { seg: 48 });
    b.cyl(paint('#2fb4cf', { roughness: 0.12, metalness: 0.1 }), 6.6, 6.6, 0.1, F.x, 1.45, F.z, { seg: 48 });
    b.box(st, 3.4, 4.4, 3.4, F.x, 2.2 + 1.0, F.z, { r: 0.12 }); b.box(dk, 4.0, 0.5, 4.0, F.x, 5.45, F.z, { r: 0.1 }); b.box(dk, 3.9, 0.5, 3.9, F.x, 1.7, F.z, { r: 0.1 });
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.add(paint('#c9a24a', { metalness: 0.8, roughness: 0.3 }), new THREE.SphereGeometry(0.45, 12, 8), F.x + Math.sin(a) * 2.1, 3.2, F.z + Math.cos(a) * 2.1); }
    // the founder's stone in front of the basin, with its plaque on the plaza side
    b.box(st, 4.2, 3.4, 1.4, F.x, 1.7, F.z + 10.2, { r: 0.12 }); b.box(dk, 4.6, 0.4, 1.8, F.x, 3.55, F.z + 10.2, { r: 0.08 }); b.box(dk, 4.6, 0.4, 1.8, F.x, 0.2, F.z + 10.2, { r: 0.08 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.76), new THREE.MeshStandardMaterial({ map: plaqueTex(1), metalness: 0.55, roughness: 0.4 })); pl.position.set(F.x, 2.0, F.z + 10.92); g.add(pl); g.plaque = pl;
    g.plaqueTex = [plaqueTex(0), plaqueTex(0.35), plaqueTex(0.7), plaqueTex(1)];
    g.statueAt = v3(F.x, 5.7, F.z);
    // little jets from the four brass balls
    const jm = new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.55, roughness: 0.1 }); g.jets = [];
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, j = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 2.4, 6), jm); j.position.set(F.x + Math.sin(a) * 3.3, 2.9, F.z + Math.cos(a) * 3.3); j.rotation.set(Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9); j.castShadow = false; g.add(j); g.jets.push(j); }
  }
  // the mayor's podium: a little stage, a lectern, the old campaign poster on its front
  { const P = PODIUM, wood = surf('plank', '#b87a46'), red = paint('#d9363e', { roughness: 0.6 });
    b.box(wood, 10, 1.6, 7, P.x, 0.8, P.z, { r: 0.08 }); b.box(red, 10.2, 0.5, 7.2, P.x, 1.45, P.z, { r: 0.06 });
    for (let i = 0; i < 2; i++) b.box(wood, 4, 0.55 + i * 0.5, 1.2, P.x, (0.55 + i * 0.5) / 2, P.z + 4.1 - i * 0.6, { r: 0.05 });
    b.box(paint('#6a3f22', { roughness: 0.5 }), 2.4, 3.6, 1.4, P.x - 2.4, 1.6 + 1.8, P.z - 1.0, { r: 0.1 });
    const po = sign('RE-ELECT\nCAPTAIN SOCKS', { w: 4.6, h: 2.6, bg: '#fff3d0', fg: '#2a3a7a', frame: '#d9363e', edge: '#2a3a7a' }); po.position.set(P.x + 2.6, 0.95, P.z + 3.56); g.add(po); g.poster = po;
    const pa = sign('PUDDING!', { w: 3.6, h: 1.2, bg: '#ffd23f', fg: '#d9363e', frame: '#ffd23f', edge: '#d9363e' }); pa.position.set(P.x + 2.6, 0.9, P.z + 3.7); pa.rotation.z = 0.12; g.add(pa); g.patch = pa;
    g.podiumTop = 1.7;
  }
  // the chalk stall: a striped awning, a table of slates and chalk boxes
  { const S = STALL, wood = surf('plank', '#c99060'), cloth = canvasTex(256, 64, (x, W, H) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#3fb7e8'; x.fillRect(i * 32, 0, 32, H); } });
    b.box(wood, 8, 0.3, 3.2, S.x, 3.2, S.z, { r: 0.06 }); for (const [dx, dz] of [[-3.7, -1.4], [3.7, -1.4], [-3.7, 1.4], [3.7, 1.4]]) b.box(paint('#ffffff'), 0.3, 3.2, 0.3, S.x + dx, 1.6, S.z + dz, { r: 0.05 });
    for (const dx of [-3.7, 3.7]) b.box(paint('#ffffff'), 0.25, 7.6, 0.25, S.x + dx, 3.8, S.z - 1.6, { r: 0.05 });
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.6), new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.8, side: THREE.DoubleSide })); aw.position.set(S.x, 7.3, S.z - 0.2); aw.rotation.x = -Math.PI / 2 + 0.35; aw.castShadow = true; g.add(aw);
    const sg = sign('SLATES & CHALK', { w: 6, h: 1.1, bg: '#2a3a7a', fg: '#ffffff', frame: '#ffffff' }); sg.position.set(S.x, 7.9, S.z + 1.6); g.add(sg);
    g.stallSlates = [];
    for (let i = 0; i < 4; i++) { const s = slate({ w: 1.2, text: ['', 'NEW?', '', 'HI'][i] }); s.position.set(S.x - 2.6 + i * 1.7, 3.6, S.z - 0.2); s.rotation.x = -1.2; g.add(s); g.stallSlates.push(s); }
    for (let i = 0; i < 3; i++) b.box(paint(['#ffd23f', '#ff8a5c', '#7ad06a'][i]), 0.9, 0.4, 0.6, S.x + 2.2 + i * 0.4, 3.55, S.z + 0.9, { r: 0.05 });
    g.stallTop = 3.35;
  }
  // the banner across the north side
  { for (const x of [-15, 15]) b.cyl(paint('#e8e1d4', { metalness: 0.3 }), 0.3, 0.38, 15, x, 7.5, -26, { seg: 12 });
    const bn = sign('NAME DAY!  PICK A NEW ONE', { w: 26, h: 3.2, bg: '#ffd84a', fg: '#e2456a', edge: '#ffffff', frame: '#e2456a' }); bn.position.set(0, 12.6, -26); g.add(bn); g.banner = bn; }
  bunting(g, [[v3(-58, 10.5, -30), v3(-4, 9.5, 26), 1.6], [v3(58, 10.5, -30), v3(4, 9.5, 26), 1.6], [v3(-58, 10.5, 16), v3(58, 10.5, 16), 2.2], [v3(-58, 11, -36), v3(58, 11, -36), 2.0]]);
  for (const [x, z] of [[-58, -30], [58, -30], [-4, 26], [4, 26], [-58, 16], [58, 16], [-58, -36], [58, -36]]) b.cyl(paint('#3a5a7a', { metalness: 0.4 }), 0.18, 0.22, 11, x, 5.5, z, { seg: 8 });
  // lamps
  for (const [x, z, ry] of [[-30, 28, 0], [30, 28, Math.PI], [-48, 0, 0], [48, 0, Math.PI]]) { const l = lamp({ height: 11, color: '#205e66' }); l.position.set(x, 0, z); l.rotation.y = ry; g.add(l); }
  // cottages: north row facing +z, west and east rows facing the plaza; each door hinged on the right, opening outward
  const COLS = ['#f7b9c9', '#a9d8f5', '#bfe8b2', '#fde49a', '#d5c3f6', '#ffcaa0', '#b4ece2', '#f9cfe2', '#ffd8a8'];
  g.cots = []; let k = 0;
  const addCot = (x, z, yaw) => {
    const c = cottage({ wall: COLS[k % COLS.length], seed: 60 + k, w: 22, d: 15, flowers: true, number: 3 + k * 2 }); c.g.position.set(x, 0, z); c.g.rotation.y = yaw; g.add(c.g);
    // re-hinge the door on its right edge, mirrored, so it swings out to the right
    const dw = 3.2; c.door.position.x = dw / 2; c.door.scale.x = -1; c.door.rotation.y = 0;
    const toW = (lx, ly, lz) => v3(lx, ly, lz).applyAxisAngle(v3(0, 1, 0), yaw).add(v3(x, 0, z));
    g.cots.push({ c, x, z, yaw, door: c.door, toW, front: toW(0, 1.0, 7.5) }); k++;
  };
  for (const x of [-78, -52, -26, 0, 26, 52, 78]) addCot(x, -48, 0);
  for (const z of [-14, 12]) { addCot(-74, z, Math.PI / 2); addCot(74, z, -Math.PI / 2); }
  // planters and benches round the plaza
  const spots = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; spots.push(v3(FOUNT.x + Math.sin(a) * 8.6, 0, FOUNT.z + Math.cos(a) * 8.6)); }
  flowers(g, spots, { seed: 9 });
  { const w = surf('plank', '#c9824a'); for (const [x, z, ry] of [[-12, 20, 0], [12, 20, 0], [-36, -8, Math.PI / 2]]) { const bb = new Batch(); bb.box(w, 6, 0.3, 1.6, 0, 1.5, 0, { r: 0.06 }); bb.box(w, 6, 1.2, 0.3, 0, 2.4, -0.7, { r: 0.06 }); for (const xx of [-2.6, 2.6]) bb.box(paint('#3b4a5c'), 0.3, 1.5, 1.4, xx, 0.75, 0, { r: 0.05 }); const q = bb.done(); q.position.set(x, 0, z); q.rotation.y = ry; g.add(q); } }
  // round trees behind the rows
  const bark = paint('#86603e', { roughness: 0.9 }), leaves = ['#5fbf57', '#7ad06a', '#f6a9c4', '#4fae55'].map((c) => paint(c, { roughness: 0.85 }));
  for (let x = -100; x <= 100; x += 13) { const h = 9 + r() * 5, lz = -66 - r() * 8; b.cyl(bark, 0.6, 0.9, h, x, h / 2, lz, { seg: 10 }); const m = leaves[Math.floor(r() * 4)]; for (const [dx, dy, rr] of [[0, h + 1.5, 4.8], [2.6, h - 0.6, 3.4], [-2.6, h - 0.3, 3.5]]) b.add(m, new THREE.IcosahedronGeometry(rr, 2), x + dx, dy, lz); }
  b.done(g);
  return shadowAll(g);
}

// ---------------- Tilly's home ----------------
export function hargreaveHome() {
  const D = { z: -2, w: 5.4, h: 10.2 };
  const g = snRoom({ w: 40, d: 26, h: 14, wall: '#d6f0e4', curtain: '#ffb347', floor: '#cf9a62', winX: -10, door: D, trim: '#ffffff' }), b = new Batch();
  const cab = paint('#f6b8c8', { roughness: 0.55 }), top = paint('#fffaf2', { roughness: 0.3 }), wood = surf('plank', '#c99060');
  // counter and stove along the back wall
  b.box(cab, 16, 3.4, 3.2, -10, 1.7, -11.4, { r: 0.12 }); b.box(top, 16.6, 0.3, 3.6, -10, 3.55, -11.3, { r: 0.08 });
  for (let i = 0; i < 5; i++) { b.box(paint('#ffd0dc', { roughness: 0.5 }), 2.8, 2.6, 0.12, -16.2 + i * 3.1, 1.8, -9.77, { r: 0.05 }); b.box(paint('#e8eef2', { metalness: 0.7, roughness: 0.3 }), 0.8, 0.16, 0.2, -16.2 + i * 3.1, 2.7, -9.68, { r: 0.04 }); }
  const SV = v3(2.5, 0, -11); b.box(paint('#3f4a56', { metalness: 0.4, roughness: 0.4 }), 5, 3.6, 3.4, SV.x, 1.8, SV.z, { r: 0.12 }); b.box(paint('#22262c', { roughness: 0.5 }), 5, 0.2, 3.4, SV.x, 3.7, SV.z, { r: 0.05 });
  for (const dx of [-1.2, 1.2]) b.cyl(paint('#111418'), 0.7, 0.7, 0.08, SV.x + dx, 3.82, SV.z + 0.3, { seg: 18 });
  b.cyl(paint('#e8433a', { roughness: 0.35 }), 0.9, 0.8, 1.1, SV.x - 1.2, 4.4, SV.z + 0.3, { seg: 18 }); g.stove = SV;
  // shelves with jars, a window-side plant
  b.box(wood, 10, 0.3, 1.6, 11, 8.6, -12.2, { r: 0.05 }); for (let i = 0; i < 6; i++) b.cyl(paint(['#ffd23f', '#7ad06a', '#3fb7e8', '#ff8a5c'][i % 4], { roughness: 0.3 }), 0.45, 0.45, 1.1, 7 + i * 1.6, 9.3, -12.1, { seg: 14 });
  // the table
  const TB = v3(-8, 0, 3); b.box(wood, 8, 0.4, 5, TB.x, 3.6, TB.z, { r: 0.1 }); for (const [x, z] of [[-3.5, -2], [3.5, -2], [-3.5, 2], [3.5, 2]]) b.box(paint('#ffffff'), 0.4, 3.4, 0.4, TB.x + x, 1.7, TB.z + z, { r: 0.08 });
  b.add(paint('#7ad06a', { roughness: 0.5 }), new THREE.CylinderGeometry(0.8, 0.6, 0.8, 16), TB.x + 1.5, 4.2, TB.z); for (let i = 0; i < 4; i++) b.add(paint(['#ff5a6e', '#ffd23f'][i % 2], { roughness: 0.5 }), new THREE.SphereGeometry(0.35, 10, 8), TB.x + 1.5 + Math.cos(i * 1.6) * 0.4, 4.75, TB.z + Math.sin(i * 1.6) * 0.4);
  g.table = TB;
  // coat hooks and a mat by the door
  b.box(paint('#3fb7e8', { roughness: 0.9 }), 3.6, 0.1, 5.2, 17.5, 0.06, D.z, { r: 0.04 });
  b.box(wood, 0.5, 0.4, 5, 19.6, 9.6, -8, { r: 0.05 }); for (let i = 0; i < 2; i++) b.box(paint(['#ffd23f', '#e8433a'][i], { roughness: 0.85 }), 1.2, 3, 0.9, 19.4, 8.0, -9.4 + i * 1.8, { r: 0.3 });
  b.done(g);
  // the founder's portrait (sepia, a lady in a wide hat) on the left wall
  const portrait = new THREE.Group(), pb = new Batch(); pb.box(paint('#a8823a', { metalness: 0.7, roughness: 0.35 }), 4.4, 5.4, 0.3, 0, 0, 0, { r: 0.12 }); pb.done(portrait);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.6), new THREE.MeshStandardMaterial({ roughness: 0.7, map: canvasTex(360, 460, (x, W, H) => {
    x.fillStyle = '#d9c39a'; x.fillRect(0, 0, W, H); x.fillStyle = '#b89a6a'; x.fillRect(0, H * 0.7, W, H * 0.3);
    x.fillStyle = '#6a4a2a'; x.fillRect(W * 0.3, H * 0.52, W * 0.4, H * 0.48);   // shoulders
    x.fillStyle = '#c9a77a'; x.fillRect(W * 0.36, H * 0.3, W * 0.28, H * 0.24);   // a blocky face
    x.fillStyle = '#4a3220'; x.fillRect(W * 0.42, H * 0.38, 12, 14); x.fillRect(W * 0.56, H * 0.38, 12, 14); x.fillRect(W * 0.45, H * 0.47, W * 0.1, 5);
    x.fillStyle = '#5a3a3a'; x.beginPath(); x.ellipse(W / 2, H * 0.29, W * 0.34, 18, 0, 0, 7); x.fill(); x.fillRect(W * 0.35, H * 0.17, W * 0.3, H * 0.12);
    x.fillStyle = '#f4f0e6'; x.beginPath(); x.ellipse(W * 0.68, H * 0.17, 10, 34, 0.5, 0, 7); x.fill();
    x.fillStyle = 'rgba(60,40,20,0.25)'; x.fillRect(0, 0, W, 8); x.fillRect(0, H - 8, W, 8);
  }) })); pic.position.z = 0.17; portrait.add(pic); portrait.position.set(-19.65, 6.4, -4); portrait.rotation.y = Math.PI / 2; g.add(portrait); g.portrait = portrait;
  // the door: hinged at its -z edge, opening into the room
  const dg = new THREE.Group(); dg.position.set(20.3, 0, D.z - D.w / 2 + 0.1); g.add(dg); g.door = dg;
  { const d2 = new Batch(); d2.box(paint('#2f8f6a', { roughness: 0.4 }), 0.4, D.h - 0.1, D.w - 0.2, 0, (D.h - 0.1) / 2, (D.w - 0.2) / 2, { r: 0.06 }); for (const [y, h] of [[2.8, 3.2], [7.2, 3.2]]) for (const s of [-1, 1]) d2.box(paint('#287a5a', { roughness: 0.45 }), 0.5, h, D.w - 1.4, 0, y, (D.w - 0.2) / 2, { r: 0.08 });
    for (const s of [-1, 1]) d2.add(paint('#e8c25a', { metalness: 0.8, roughness: 0.3 }), new THREE.SphereGeometry(0.28, 12, 8), s * 0.35, 5, D.w - 1.0); d2.done(dg); }
  // outside: the porch, the steps, a lawn, a picket fence, a cottage across the lane
  const P = new Batch(), deck = surf('plank', '#d9c3a0'); P.box(deck, 12, 0.6, 16, 27, 0.3, D.z, { r: 0.06 }); for (let i = 0; i < 2; i++) P.box(deck, 2.4, 0.3, 8, 34.2 + i * 2.4, 0.15, D.z, { r: 0.05 });
  for (const z of [-7, 5]) P.box(paint('#ffffff'), 0.6, 12, 0.6, 32.5, 6, D.z + z, { r: 0.08 }); P.box(paint('#ffffff'), 0.6, 0.5, 16, 32.5, 12, D.z, { r: 0.06 });
  P.box(surf('shingle', '#5a6f9a'), 14, 0.4, 18, 27.5, 12.6, D.z, { rz: 0.12, r: 0.05 });
  const grass = surf('grass', '#7ccf5e'); grass.userData.span = 14; g.add(flat(grass, 300, 300, 140, -0.04, D.z));
  g.add(flat(surf('concrete', '#9a9da3'), 22, 300, 62, 0.0, D.z));
  for (const [x, z, s] of [[25, -11, 2.6], [25, 8, 2.4], [40, -14, 3.2], [40, 11, 3]]) P.add(paint('#4fae55', { roughness: 0.85 }), new THREE.IcosahedronGeometry(s, 2), x, s * 0.75, z);
  picket(P, 38, 49, D.z - 6, {}); picket(P, 38, 49, D.z + 6, {});
  { const wm = paint('#d6f0e4'), z0 = D.z - D.w / 2 - 0.45, z1 = D.z + D.w / 2 + 0.45, X = 20.3 + 0.6;   // the outer face, with the doorway left open
    P.box(wm, 0.4, 14, z0 + 14, X, 7, (z0 - 14) / 2, { r: 0.02 }); P.box(wm, 0.4, 14, 14 - z1, X, 7, (z1 + 14) / 2, { r: 0.02 }); P.box(wm, 0.4, 14 - D.h - 0.5, z1 - z0, X, (14 + D.h + 0.5) / 2, D.z, { r: 0.02 });
    for (const zz of [z0, z1]) P.box(WHITE(), 0.7, D.h + 0.6, 0.6, X + 0.1, (D.h + 0.6) / 2, zz, { r: 0.06 }); P.box(WHITE(), 0.7, 0.6, z1 - z0 + 0.6, X + 0.1, D.h + 0.6, D.z, { r: 0.06 });
    const ns = sign('No. 7', { w: 1.6, h: 0.7, bg: '#ffffff', fg: '#2f8f6a', frame: '#2f8f6a' }); ns.position.set(X + 0.25, 7.6, z1 + 1.2); ns.rotation.y = Math.PI / 2; g.add(ns); }
  P.done(g);
  { const c = cottage({ wall: '#fde49a', seed: 81, w: 22, d: 15, flowers: true, number: 8 }); c.g.position.set(92, 0, D.z + 2); c.g.rotation.y = -Math.PI / 2; g.add(c.g); }
  { const c = cottage({ wall: '#f7b9c9', seed: 82, w: 22, d: 15, flowers: true, number: 10 }); c.g.position.set(92, 0, D.z + 34); c.g.rotation.y = -Math.PI / 2; g.add(c.g); }
  { const l = lamp({ height: 11, color: '#205e66' }); l.position.set(50, 0, D.z + 9); l.rotation.y = Math.PI; g.add(l); }
  g.D = D; g.porch = v3(24, 0.6, D.z); g.doorX = 20.3;
  return shadowAll(g);
}
