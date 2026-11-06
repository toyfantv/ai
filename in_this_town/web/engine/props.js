// Reusable props: giant eye, two-bone spider legs, canvas signs/clocks, curtains, glow sprites.
import * as THREE from 'three';
import { mat } from './core.js';
import { GLOW } from './creatures.js';

const UP = new THREE.Vector3(0, 1, 0);

// A segment mesh (unit cylinder along Y) placed between two points.
export function placeSegment(mesh, a, b, radius) {
  const d = b.clone().sub(a); const len = d.length();
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  mesh.scale.set(radius, len, radius);
}
const segGeo = new THREE.CylinderGeometry(1, 0.8, 1, 8);
const jointGeo = new THREE.SphereGeometry(1, 10, 8);

// Two-bone leg: hip -> knee -> foot, knee pushed up/outwards. Returns {update(hip, foot, outward)}.
export function makeLeg(parent, lenA, lenB, radius, material) {
  const a = new THREE.Mesh(segGeo, material), b = new THREE.Mesh(segGeo, material);
  const j = new THREE.Mesh(jointGeo, material), f = new THREE.Mesh(jointGeo, material);
  [a, b, j, f].forEach((m) => { m.castShadow = true; parent.add(m); });
  const knee = new THREE.Vector3();
  return {
    update(hip, foot, outward) {
      const d = foot.clone().sub(hip); const dist = Math.min(d.length(), lenA + lenB - 1e-3);
      const dir = d.clone().normalize();
      const x = (lenA * lenA - lenB * lenB + dist * dist) / (2 * dist);
      const h = Math.sqrt(Math.max(0, lenA * lenA - x * x));
      // bend direction: perpendicular to dir, biased up and outward
      const bend = outward.clone().multiplyScalar(0.6).add(UP).normalize();
      bend.sub(dir.clone().multiplyScalar(bend.dot(dir))).normalize();
      knee.copy(hip).add(dir.clone().multiplyScalar(x)).add(bend.multiplyScalar(h));
      placeSegment(a, hip, knee, radius); placeSegment(b, knee, foot, radius * 0.7);
      j.position.copy(knee); j.scale.setScalar(radius * 1.3);
      f.position.copy(foot); f.scale.setScalar(radius * 0.8);
    },
    meshes: [a, b, j, f],
  };
}

// Gait: feet step in alternating groups. Returns foot position for leg i given body pose.
// base: foot rest point in world; fwd: walk direction (unit); phase: cycle 0..1 per leg; stride, lift.
export function footAt(base, fwd, phase, stride, lift) {
  const p = phase % 1;
  const swing = p < 0.4; // 40% of the cycle in the air
  const s = swing ? -0.5 + p / 0.4 : 0.5 - (p - 0.4) / 0.6;
  const y = swing ? Math.sin((p / 0.4) * Math.PI) * lift : 0;
  return base.clone().add(fwd.clone().multiplyScalar(s * stride)).setY(base.y + y);
}

export function makeEye(radius = 10, irisColor = '#ffb020', glow = true) {
  const g = new THREE.Group();
  const sclera = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), new THREE.MeshStandardMaterial({ color: '#f4eee6', roughness: 0.25, emissive: '#3a2a2a', emissiveIntensity: 0.4 }));
  g.add(sclera);
  const iris = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.48, 48), new THREE.MeshBasicMaterial({ color: irisColor }));
  iris.position.z = radius * 0.99; g.add(iris);
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.44, radius * 0.5, 48), new THREE.MeshBasicMaterial({ color: '#5a1a05' }));
  ring.position.z = radius * 0.995; g.add(ring);
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.2, 32), new THREE.MeshBasicMaterial({ color: '#000' }));
  pupil.position.z = radius * 1.0; g.add(pupil);
  const shine = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.07, 16), new THREE.MeshBasicMaterial({ color: '#fff' }));
  shine.position.set(-radius * 0.15, radius * 0.18, radius * 1.002); g.add(shine);
  // veins
  const vm = new THREE.MeshBasicMaterial({ color: '#c0303a' });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const v = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.02, radius * 0.35, radius * 0.01), vm);
    v.position.set(Math.cos(a) * radius * 0.7, Math.sin(a) * radius * 0.7, radius * 0.72); v.rotation.z = a - Math.PI / 2;
    v.lookAt(0, 0, radius * 3); v.rotateZ(a); g.add(v);
  }
  let halo = null;
  if (glow) {
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: irisColor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
    halo.scale.setScalar(radius * 4); halo.position.z = radius * 0.5; g.add(halo);
  }
  return { group: g, pupil, iris, halo, setPupil(s) { pupil.scale.setScalar(s); } };
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function glowSprite(color, size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity }));
  s.scale.setScalar(size); return s;
}

export function textPlane(lines, w, h, worldW, bg = null) {
  const tex = canvasTex(w, h, (ctx) => {
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l) => { ctx.font = l.font; ctx.fillStyle = l.color; if (l.stroke) { ctx.lineWidth = l.stroke; ctx.strokeStyle = '#000'; ctx.strokeText(l.text, w / 2, l.y * h); } ctx.fillText(l.text, w / 2, l.y * h); });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldW * h / w), new THREE.MeshBasicMaterial({ map: tex, transparent: !bg, side: THREE.DoubleSide, toneMapped: false }));
  return m;
}

export { mat };
