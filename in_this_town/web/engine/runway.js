// Episode 22's fashion kit: a silver gown that can cinch, a dress form wearing one, a judge's five-star paddle.
//   const g = gown({ hipY: ch.hipY }); ch.hips.add(g.mesh); g.set(k, t);   // k: 0 = flowing, 1 = cinched round the legs
//   const f = dressForm({ hipY: 2.39 }); parent.add(f.g);                    // stands at its origin
//   const p = starPaddle(2.2); ch.arms[1].add(p);                             // hangs off a hand ARM below the shoulder
import * as THREE from 'three';
import { lerp, smooth, rng } from './core.js';
import { canvasTex } from './props.js';
import { paint } from './kit.js';

// white sparkles on black, for an emissive map
export function sparkleTex(seed = 31) {
  const t = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const r = rng(seed); for (let i = 0; i < 900; i++) { const a = r() * w, b = r() * h, s = 0.6 + r() * 2.2; x.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`; x.fillRect(a, b, s, s); if (r() < 0.08) { x.fillRect(a - 4, b + s / 2 - 0.5, 8 + s, 1); x.fillRect(a + s / 2 - 0.5, b - 4, 1, 8 + s); } } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// a lathe with its own vertices, so it can be reshaped every frame
export function gownGeo() {
  const seg = 40, rows = 26, g = new THREE.BufferGeometry(), pos = new Float32Array((seg + 1) * (rows + 1) * 3), uv = new Float32Array((seg + 1) * (rows + 1) * 2), idx = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= seg; i++) { const k = j * (seg + 1) + i; uv[k * 2] = i / seg * 3; uv[k * 2 + 1] = j / rows * 2; }
  for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + seg + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  g.userData = { seg, rows };
  return g;
}
// top: the waist's height above the hip joint, H0: hip height, k: 0 = flowing (a column with a mermaid flare), 1 = cinched round the legs
export function shapeGown(g, top, H0, k, t = 0) {
  const { seg, rows } = g.userData, p = g.attributes.position.array, bot = -H0 + 0.1;
  for (let j = 0; j <= rows; j++) {
    const f = j / rows, y = lerp(top, bot, f), knee = smooth(0.35, 1, f);
    let r = 1.1 + 0.04 * smooth(0, 0.4, f) + 0.4 * Math.pow(smooth(0.55, 1, f), 1.7);
    r = lerp(r, Math.min(r, 1.1 + 0.03 * f), k);
    const zs = lerp(0.62, 0.92, Math.pow(f, 0.8));
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2, ripple = 1 + 0.025 * Math.sin(a * 9 + t * 2.2) * knee * (1 - k), q = (j * (seg + 1) + i) * 3;
      p[q] = Math.sin(a) * r * ripple; p[q + 1] = y; p[q + 2] = Math.cos(a) * r * zs * ripple;
    }
  }
  g.attributes.position.needsUpdate = true; g.computeVertexNormals();
}
export function gownMat(sp) {
  return new THREE.MeshStandardMaterial({ color: '#c9cfdc', metalness: 0.62, roughness: 0.32, emissive: '#e6ecff', emissiveMap: sp, emissiveIntensity: 0.42, side: THREE.DoubleSide });
}
// a gown for a character's hips: { mesh, mat, set(k, t) }
export function gown(o = {}) {
  const H0 = o.hipY ?? 2.39, top = o.top ?? 0.62, geo = gownGeo(), mat = gownMat(o.sparkle || sparkleTex());
  shapeGown(geo, top, H0, 0); const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  return { mesh, mat, geo, set: (k, t) => shapeGown(geo, top, H0, k, t) };
}
// a dark-silver dress form wearing the gown, on a pole with a neck knob: { g, mat, geo }
export function dressForm(o = {}) {
  const H0 = o.hipY ?? 2.39, top = o.top ?? 0.62, sp = o.sparkle || sparkleTex(), g = new THREE.Group();
  const mat = gownMat(sp); mat.color.set('#4c5262'); mat.metalness = 0.85; mat.roughness = 0.22; mat.emissiveIntensity = 1.1;
  const geo = gownGeo(); shapeGown(geo, top, H0, 0); const skirt = new THREE.Mesh(geo, mat); skirt.position.y = H0; skirt.castShadow = true; g.add(skirt);
  const bodG = new THREE.LatheGeometry([[0.001, 0], [1.06, 0], [0.98, 0.5], [0.9, 1.0], [1.05, 1.55], [1.0, 1.9], [0.62, 2.12], [0.3, 2.2], [0.001, 2.22]].map(([a, b]) => new THREE.Vector2(a, b)), 32);
  const bod = new THREE.Mesh(bodG, mat); bod.scale.z = 0.62; bod.position.y = H0 + top - 0.02; bod.castShadow = true; g.add(bod);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.6, 12), paint('#c9ced8', { metalness: 0.9, roughness: 0.2 })); pole.position.y = H0 + top + 2.4; g.add(pole);
  const nk = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 12), paint('#f1e9ee', { roughness: 0.4 })); nk.scale.set(0.75, 0.55, 0.6); nk.position.y = H0 + top + 2.75; g.add(nk);
  return { g, mat, geo };
}
// a judge's paddle: a stick and a white card with five gold stars, hanging ARM below the shoulder pivot
export function starPaddle(ARM = 2.2) {
  const p = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), paint('#2a2a30')); st.position.y = -ARM - 0.55; p.add(st);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(512, 236, (x, w, h) => { x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 30); x.fill(); x.fillStyle = '#ffc928'; x.font = '900 86px ITTInter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('★★★★★', w / 2, h / 2 + 6); }), side: THREE.DoubleSide, color: new THREE.Color(1.15, 1.15, 1.15) }));
  card.position.y = -ARM - 1.6; card.rotation.x = Math.PI; card.userData.noAO = true; p.add(card); return p;
}
