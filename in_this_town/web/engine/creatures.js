// Stylized whales, instanced fish schools, glowing jellyfish.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './core.js';

// Shared "seen through water" tint applied to creatures that live inside the sky ocean.
export const WT = { uWaterTint: { value: new THREE.Color('#3fa0e0') }, uWaterTintAmt: { value: 0.25 } };
function waterTinted(m) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uWaterTint = WT.uWaterTint; s.uniforms.uWaterTintAmt = WT.uWaterTintAmt;
    s.fragmentShader = 'uniform vec3 uWaterTint; uniform float uWaterTintAmt;\n' + s.fragmentShader.replace('#include <dithering_fragment>',
      '#include <dithering_fragment>\n gl_FragColor.rgb = mix(gl_FragColor.rgb, uWaterTint, uWaterTintAmt);');
  };
  m.customProgramCacheKey = () => 'watertint';
  return m;
}

// ---------- whale ----------
function whaleGeometry() {
  const prof = [[0.0, -1], [0.05, -0.92], [0.09, -0.75], [0.14, -0.5], [0.19, -0.2], [0.215, 0.1], [0.215, 0.35], [0.2, 0.6], [0.16, 0.8], [0.1, 0.93], [0.0, 1.0]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14);
  g.rotateX(Math.PI / 2); // length along +z (head at +z)
  g.scale(1, 0.82, 1);
  // vertex colors: dark back, pale belly
  const p = g.attributes.position, cols = [];
  const top = new THREE.Color('#2c5c9c'), belly = new THREE.Color('#dce8f2');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), z = p.getZ(i);
    const k = THREE.MathUtils.smoothstep(y, -0.02, 0.06);
    const c = belly.clone().lerp(top, k);
    if (y < 0 && Math.sin(z * 60) > 0.3) c.multiplyScalar(0.9); // throat grooves
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return g;
}

export function makeWhale(length = 80) {
  const root = new THREE.Group();
  const m = waterTinted(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.55, transparent: true }));
  const finM = waterTinted(new THREE.MeshStandardMaterial({ color: '#2a5590', flatShading: true, roughness: 0.6, transparent: true }));
  const body = new THREE.Mesh(whaleGeometry(), m); root.add(body);
  const tail = new THREE.Group(); tail.position.z = -0.88; root.add(tail);
  const fluke = new THREE.Shape(); fluke.moveTo(0, 0); fluke.quadraticCurveTo(0.22, -0.05, 0.36, -0.2); fluke.quadraticCurveTo(0.2, -0.12, 0, -0.1);
  fluke.quadraticCurveTo(-0.2, -0.12, -0.36, -0.2); fluke.quadraticCurveTo(-0.22, -0.05, 0, 0);
  const fg = new THREE.ExtrudeGeometry(fluke, { depth: 0.02, bevelEnabled: false }); fg.rotateX(Math.PI / 2); fg.translate(0, 0.01, 0);
  const fl = new THREE.Mesh(fg, finM); tail.add(fl);
  const fins = [-1, 1].map((s) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.09), finM);
    const piv = new THREE.Group(); piv.position.set(s * 0.17, -0.08, 0.38); piv.add(f); f.position.x = s * 0.15; f.rotation.y = s * 0.5;
    root.add(piv); return piv;
  });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: '#111' }));
    e.position.set(s * 0.17, -0.02, 0.66); root.add(e);
  }
  root.scale.setScalar(length / 2);
  root.renderOrder = 10;
  root.traverse((o) => { if (o.isMesh) { o.renderOrder = 10; o.castShadow = false; } });
  return {
    root, mats: [m, finM],
    animate(t, speed = 1) {
      tail.rotation.x = Math.sin(t * 1.1 * speed) * 0.35;
      body.rotation.x = Math.sin(t * 1.1 * speed - 0.8) * 0.02;
      fins.forEach((f, i) => { f.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 0.9) * 0.15); });
    },
    setOpacity(a) { [m, finM].forEach((x) => { x.opacity = a; }); root.visible = a > 0.01; },
  };
}

// ---------- fish ----------
function fishGeometry() {
  const body = new THREE.SphereGeometry(1, 12, 8); body.scale(0.42, 0.75, 1.3);
  const tail = new THREE.ConeGeometry(0.6, 0.9, 4); tail.rotateX(Math.PI / 2); tail.scale(0.25, 1.1, 1); tail.translate(0, 0, -1.55);
  const fin = new THREE.ConeGeometry(0.35, 0.7, 3); fin.translate(0, 0.85, -0.1);
  return mergeGeometries([body.toNonIndexed(), tail.toNonIndexed(), fin.toNonIndexed()]);
}
const FISH_COLORS = ['#ff8a3d', '#ffd23f', '#3fe0d0', '#ff5fa2', '#9b7bff', '#5fb8ff', '#ffffff'];

export function makeSchool({ count, path, size = 1, spread = 8, seed = 1, inWater = false }) {
  const r = rng(seed);
  const m = new THREE.MeshStandardMaterial({ roughness: 0.4 });
  if (inWater) { waterTinted(m); m.transparent = true; }
  const mesh = new THREE.InstancedMesh(fishGeometry(), m, count);
  const pal = [FISH_COLORS[Math.floor(r() * FISH_COLORS.length)], FISH_COLORS[Math.floor(r() * FISH_COLORS.length)]];
  const offs = [];
  for (let i = 0; i < count; i++) {
    offs.push({ x: (r() - 0.5) * spread * 2, y: (r() - 0.5) * spread * 0.6, z: (r() - 0.5) * spread * 2, ph: r() * 6.28, s: size * (0.7 + r() * 0.6) });
    mesh.setColorAt(i, new THREE.Color(pal[i % 2]));
  }
  mesh.frustumCulled = false; mesh.renderOrder = inWater ? 10 : 0; mesh.castShadow = !inWater;
  const dummy = new THREE.Object3D();
  const pos = (ft) => [path(ft)];
  return {
    mesh,
    update(ft) {
      const [c] = pos(ft);
      const [c2] = pos(ft + 0.05);
      const dir = c2.clone().sub(c).normalize();
      for (let i = 0; i < count; i++) {
        const o = offs[i];
        const w = Math.sin(ft * 1.3 + o.ph);
        dummy.position.set(c.x + o.x + w * 0.8, c.y + o.y + Math.cos(ft + o.ph) * 0.5, c.z + o.z + w * 0.6);
        dummy.lookAt(dummy.position.clone().add(dir));
        dummy.rotateY(Math.sin(ft * 9 + o.ph) * 0.18);
        dummy.scale.setScalar(o.s);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---------- jellyfish ----------
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d'); const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
export const GLOW = glowTexture();

export function makeJellies(scene, positions, seed = 3) {
  const r = rng(seed);
  const bellGeo = new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const list = positions.map((p, i) => {
    const color = new THREE.Color(i % 3 === 1 ? '#ff6ad5' : i % 3 === 2 ? '#b98cff' : '#5cf0ff');
    const g = new THREE.Group(); g.position.copy(p);
    const bell = new THREE.Mesh(bellGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(bell);
    const tm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
    const tents = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const tt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4 + r() * 2, 0.12), tm);
      tt.position.set(Math.cos(a) * 0.9, -2.4, Math.sin(a) * 0.9); g.add(tt); tents.push(tt);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(11); g.add(glow);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: GLOW, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(p.x, 0.4, p.z); pool.scale.setScalar(26);
    scene.add(pool); scene.add(g);
    return { g, bell, tents, glow, pool, base: p.clone(), ph: r() * 6.28 };
  });
  return {
    list,
    update(t, vis) {
      list.forEach((j) => {
        const pulse = Math.sin(t * 2.2 + j.ph);
        j.g.visible = vis > 0.01; j.pool.visible = vis > 0.01;
        j.g.position.set(j.base.x + Math.sin(t * 0.3 + j.ph) * 2, j.base.y + Math.sin(t * 0.6 + j.ph) * 1.6 + pulse * 0.25, j.base.z);
        j.bell.scale.set(1 + pulse * 0.12, 1 - pulse * 0.15, 1 + pulse * 0.12);
        j.tents.forEach((tt, k) => { tt.rotation.z = Math.sin(t * 2 + k + j.ph) * 0.2; });
        j.bell.material.opacity = 0.85 * vis; j.glow.material.opacity = 0.9 * vis;
        j.pool.material.opacity = 0.55 * vis * THREE.MathUtils.clamp(1.3 - j.g.position.y / 40, 0.2, 1);
        j.pool.position.x = j.g.position.x;
      });
    },
  };
}
