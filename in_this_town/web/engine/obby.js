// The obby kit (Episode 26): candy platforms with a neon top trim (.userData.edge: raise its emissive in space), canvas signs,
// spinning laser crosses (crisp core lines and a faint additive halo; spin .beams.rotation.z) and a futuristic control chair with
// holo panels (.holo, .seatY = the cushion's top above the chair's base). Library names: obby_platform, laser_cross, control_chair.
import * as THREE from 'three';
import { Batch, paint } from './kit.js';

export function edgeMat(col) { return new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.25, roughness: 0.35 }); }
export function obbyPlatform(w, d, col, o = {}) {
  const g = new THREE.Group(), c = new THREE.Color(col), top = c.clone().lerp(new THREE.Color('#ffffff'), 0.28);
  const b = new Batch(), h = o.h ?? 1.6;
  b.box(paint(col, { roughness: 0.42 }), w, h, d, 0, -h / 2 - 0.12, 0, { r: 0.22 });
  b.box(paint('#' + top.getHexString(), { roughness: 0.3 }), w - 0.5, 0.26, d - 0.5, 0, -0.06, 0, { r: 0.1 });
  b.done(g);
  // a neon trim round the top edge: faint by day, the course's lines in space
  const em = edgeMat(col), t = 0.16;
  for (const [x, z, ww, dd] of [[0, d / 2 - 0.02, w, t], [0, -d / 2 + 0.02, w, t], [w / 2 - 0.02, 0, t, d], [-w / 2 + 0.02, 0, t, d]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww, t, dd), em); m.position.set(x, -0.2, z); g.add(m);
  }
  g.userData.edge = em;
  if (o.num != null) {   // a checkpoint: the stage number painted on top
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,0.0)'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#ffffff'; x.lineWidth = 14; x.beginPath(); x.arc(128, 128, 104, 0, 7); x.stroke();
    x.fillStyle = '#ffffff'; x.font = '900 150px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(o.num), 128, 138);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.4 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.09; g.add(m);
  }
  return g;
}
export function canvasSign(text, w, h, o = {}) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.round(1024 * h / w); const x = cv.getContext('2d');
  x.fillStyle = o.bg || '#ffffff'; x.beginPath(); x.roundRect(8, 8, cv.width - 16, cv.height - 16, 40); x.fill();
  if (o.edge) { x.strokeStyle = o.edge; x.lineWidth = 18; x.stroke(); }
  x.fillStyle = o.fg || '#1a1a2e'; x.font = `900 ${o.px || 150}px ITTInter, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = text.split('\n'); lines.forEach((ln, i) => x.fillText(ln, 512, cv.height / 2 + (i - (lines.length - 1) / 2) * (o.px || 150) * 1.05));
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.5, emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: o.glow ?? 0.15 }));
}

// ---- lasers: crisp red lines on a hub, a faint halo ----
export function laserCross(arms = 2, len = 7) {
  const g = new THREE.Group(), hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.8, 20), paint('#2a2a3a', { roughness: 0.3, metalness: 0.6 })); hub.rotation.x = Math.PI / 2; g.add(hub);
  const core = new THREE.MeshBasicMaterial({ color: '#ff3355' }), halo = new THREE.MeshBasicMaterial({ color: '#ff1a6a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const beams = new THREE.Group(); g.add(beams);
  for (let i = 0; i < arms; i++) {
    const a = new THREE.Group(); a.rotation.z = i * Math.PI / arms;
    const c = new THREE.Mesh(new THREE.BoxGeometry(len * 2, 0.09, 0.09), core); a.add(c);
    const h = new THREE.Mesh(new THREE.BoxGeometry(len * 2, 0.34, 0.34), halo); h.userData.noAO = true; a.add(h);
    beams.add(a);
  }
  const em = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 24), new THREE.MeshBasicMaterial({ color: '#ff5a7a' })); g.add(em);
  g.beams = beams; return g;
}
export function controlChair() {
  const ch = new THREE.Group();
  const cb = new Batch(), shell = paint('#e8ecf6', { roughness: 0.25, metalness: 0.2 }), dark = paint('#1a2034', { roughness: 0.3, metalness: 0.6 }), pad = paint('#2a3150', { roughness: 0.55 });
  cb.cyl(dark, 0.9, 1.4, 1.6, 0, 0.8, 0, { seg: 24 });
  cb.box(shell, 3.0, 0.5, 2.8, 0, 1.85, 0.1, { r: 0.22 });           // the seat shell
  cb.box(pad, 2.5, 0.28, 2.4, 0, 2.2, 0.15, { r: 0.12 });            // the cushion: its top is the seat (y 2.34 above the chair's base)
  cb.box(shell, 3.0, 4.6, 0.55, 0, 4.2, -1.35, { r: 0.25, rx: -0.12 }); // the back
  cb.box(pad, 2.4, 3.8, 0.2, 0, 4.25, -1.03, { r: 0.08, rx: -0.12 });
  cb.box(shell, 2.2, 1.0, 0.7, 0, 6.85, -1.7, { r: 0.3, rx: -0.12 }); // the headrest
  for (const sx of [-1, 1]) { cb.box(shell, 0.55, 1.2, 2.6, sx * 1.75, 2.6, 0.25, { r: 0.2 }); cb.box(dark, 0.7, 0.18, 1.6, sx * 1.75, 3.25, 0.7, { r: 0.06 }); }
  cb.done(ch);
  const cn = new THREE.MeshBasicMaterial({ color: '#5ae4ff' });
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.2, 0.06), cn); m.position.set(sx * 1.52, 4.2, -1.08); m.rotation.x = -0.12; ch.add(m); const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.6), cn); m2.position.set(sx * 2.04, 2.62, 0.25); ch.add(m2); }
  // holo panels over the armrests
  const hp = (w, h) => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d'); x.strokeStyle = '#7ff0ff'; x.lineWidth = 6; x.strokeRect(6, 6, 244, 148); x.fillStyle = 'rgba(80,220,255,0.25)'; x.fillRect(6, 6, 244, 148); x.fillStyle = '#9ff6ff'; for (let i = 0; i < 6; i++) x.fillRect(20, 24 + i * 20, 60 + (i * 37) % 150, 8); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); };
  ch.holo = [-1, 1].map((sx) => { const m = hp(1.5, 0.95); m.position.set(sx * 1.9, 3.9, 1.2); m.rotation.set(-0.5, -sx * 0.4, 0); m.userData.noAO = true; ch.add(m); return m; });
  ch.seatY = 2.34;
  return ch;
}
