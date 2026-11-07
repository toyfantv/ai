// Atmosphere kit: what fills the air in a shot. Everything moves from uniforms, so a frame depends only on t.
//   const air = atmos(dust(scene, { centre: v3(0, 6, 0), size: 60 }), clouds(scene));   air.update(t) each frame
import * as THREE from 'three';
import { v3, rng } from './core.js';

const softPoint = `
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);`;

function points(scene, o, vert, frag, uniforms) {
  const r = rng(o.seed || 7), n = o.count, pos = new Float32Array(n * 3), seed = new Float32Array(n);
  const S = o.size, H = o.height ?? S * 0.5, c = o.centre || v3(0, H / 2, 0);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = c.x + (r() - 0.5) * S; pos[i * 3 + 1] = c.y + (r() - 0.5) * H; pos[i * 3 + 2] = c.z + (r() - 0.5) * S; seed[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, ...uniforms },
    vertexShader: vert, fragmentShader: frag });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.noAO = true;
  (o.parent || scene).add(p);
  p.update = (t) => { m.uniforms.t.value = t; };
  return p;
}

// slow motes that catch the light
export function dust(scene, o = {}) {
  return points(scene, { count: 500, size: 60, ...o }, `
    attribute float seed; uniform float t, px; varying float f;
    void main(){ vec3 p = position;
      p.x += sin(t * 0.21 + seed * 40.0) * 1.6; p.y += sin(t * 0.13 + seed * 90.0) * 1.1; p.z += cos(t * 0.17 + seed * 70.0) * 1.6;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      gl_PointSize = min(px * (0.6 + seed) * 300.0 / max(1.0, -mv.z), 9.0 * px);
      f = 0.55 + 0.45 * sin(t * 0.9 + seed * 30.0); }`, `
    uniform vec3 color; uniform float amount; varying float f;
    void main(){ ${softPoint} gl_FragColor = vec4(color, a * f * amount); }`,
  { color: { value: new THREE.Color(o.color || '#fff0cc') }, px: { value: o.pointSize ?? 1.1 }, amount: { value: o.amount ?? 0.55 } });
}

// quick twinkles around something magic or rich
export function sparkles(scene, o = {}) {
  return points(scene, { count: 120, size: 16, ...o }, `
    attribute float seed; uniform float t, px; varying float f;
    void main(){ vec3 p = position; float ph = fract(t * (0.35 + seed * 0.4) + seed * 13.0);
      p.y += ph * 2.2;
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
      f = pow(sin(ph * 3.14159), 3.0);
      gl_PointSize = px * (0.5 + f) * 420.0 / max(1.0, -mv.z); }`, `
    uniform vec3 color; varying float f;
    void main(){ vec2 q = abs(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, q.x + q.y) + 0.8 * smoothstep(0.06, 0.0, min(q.x, q.y)) * smoothstep(0.5, 0.1, max(q.x, q.y));
      gl_FragColor = vec4(color * 1.6, a * f); }`,
  { color: { value: new THREE.Color(o.color || '#fff4b8') }, px: { value: o.pointSize ?? 1 } });
}

// a soft beam: window light, a lamp, a moon shaft
export function shaft(scene, o = {}) {
  const from = o.from || v3(0, 20, 0), to = o.to || v3(0, 0, 0), len = from.distanceTo(to);
  const g = new THREE.CylinderGeometry(o.top ?? 1.5, o.bottom ?? 5, len, 32, 1, true);
  g.translate(0, -len / 2, 0);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { color: { value: new THREE.Color(o.color || '#fff0d0') }, amount: { value: o.amount ?? 0.2 } },
    vertexShader: `varying vec3 n, v; varying float h; void main(){ h = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0);
      n = normalize(normalMatrix * normal); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 n, v; varying float h; uniform vec3 color; uniform float amount;
      void main(){ float e = pow(abs(dot(normalize(n), normalize(v))), 2.5);
        gl_FragColor = vec4(color, e * amount * smoothstep(0.0, 0.9, h)); }` });
  const b = new THREE.Mesh(g, m); b.position.copy(from); b.userData.noAO = true;
  b.quaternion.setFromUnitVectors(v3(0, -1, 0), to.clone().sub(from).normalize());
  (o.parent || scene).add(b);
  return b;
}

// a torch flame: two teardrops that flicker and a real light
export function flame(parent, o = {}) {
  const s = o.size ?? 1, g = new THREE.Group();
  const drop = new THREE.LatheGeometry([[0, 0], [0.32, 0.16], [0.36, 0.42], [0.2, 0.86], [0, 1.45]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  const outer = new THREE.Mesh(drop, new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color || '#ff9a2a').multiplyScalar(2.6) }));
  const inner = new THREE.Mesh(drop, new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2b0').multiplyScalar(3.2) }));
  inner.scale.setScalar(0.55); inner.position.y = 0.04;
  outer.userData.noAO = inner.userData.noAO = true;
  g.add(outer, inner); g.scale.setScalar(s);
  const base = o.intensity ?? 30 * s;
  const light = o.light === false ? null : new THREE.PointLight(o.color || '#ffa040', base, 26 * s, 1.8);
  if (light) { light.position.y = 0.8; g.add(light); }
  if (o.pos) g.position.copy(o.pos);
  parent.add(g);
  const ph = (o.seed ?? 1) * 7.1;
  g.update = (t) => {
    const f = 1 + 0.12 * Math.sin(t * 13 + ph) + 0.07 * Math.sin(t * 29 + ph * 2);
    outer.scale.set(1 / f, f, 1 / f); outer.rotation.z = 0.07 * Math.sin(t * 7 + ph);
    if (light) light.intensity = base * f;
  };
  return g;
}

// fat bright clouds, as one instanced mesh
export function clouds(scene, o = {}) {
  const r = rng(o.seed || 3), n = o.count ?? 12, per = 9, S = o.spread ?? 900, y = o.y ?? 170, puff = o.size ?? 26;
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3),
    new THREE.MeshStandardMaterial({ color: o.color || '#ffffff', emissive: o.color || '#ffffff', emissiveIntensity: 0.3, roughness: 1, fog: false }), n * per);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion();
  let i = 0;
  for (let c = 0; c < n; c++) {
    const cx = (r() - 0.5) * S, cz = (r() - 0.5) * S, cy = y + (r() - 0.5) * 40, w = 1 + r() * 0.8;
    for (let k = 0; k < per; k++) {
      const u = k / (per - 1) - 0.5, rad = puff * (0.45 + 0.55 * Math.cos(u * 3)) * (0.8 + r() * 0.4) * w;
      M.compose(v3(cx + u * puff * 4.4 * w, cy + r() * puff * 0.35, cz + (r() - 0.5) * puff * 1.6), q, v3(rad, rad * 0.72, rad));
      im.setMatrixAt(i++, M);
    }
  }
  im.frustumCulled = false;
  (o.parent || scene).add(im);
  im.update = (t) => { im.position.x = t * (o.drift ?? 0.6); };
  return im;
}

// leaves coming down, tumbling; a pure function of t
export function leaves(scene, o = {}) {
  const n = o.count ?? 260, S = o.size ?? 80, H = o.height ?? 40, c = o.centre || v3(0, H / 2, 0), r = rng(o.seed || 21);
  const g = new THREE.PlaneGeometry(0.42, 0.26); g.rotateZ(0.5);
  const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), n);
  const items = [], col = new THREE.Color(), cols = o.colors || ['#3f7a35', '#6a9a3f', '#a5a648', '#2f5f30'];
  for (let i = 0; i < n; i++) { items.push({ x: (r() - 0.5) * S, z: (r() - 0.5) * S, y: r(), v: 0.05 + r() * 0.09, p: r() * 9, w: 0.7 + r() * 1.4 }); m.setColorAt(i, col.set(cols[i % cols.length])); }
  m.instanceColor.needsUpdate = true; m.frustumCulled = false; m.userData.noAO = true;
  (o.parent || scene).add(m);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = v3(1, 1, 1), p = v3(0, 0, 0);
  m.update = (t) => {
    items.forEach((a, i) => {
      const f = ((a.y - t * a.v * (o.speed ?? 1)) % 1 + 1) % 1;
      p.set(c.x + a.x + Math.sin(t * a.w + a.p) * 1.4, c.y - H / 2 + f * H, c.z + a.z + Math.cos(t * a.w * 0.8 + a.p) * 1.4);
      q.setFromEuler(e.set(t * a.w * 1.3 + a.p, t * a.w + a.p, a.p));
      M.compose(p, q, s); m.setMatrixAt(i, M);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  return m;
}

// sparks thrown from a point at time t0; set t0 with .fire(t0)
export function burst(scene, o = {}) {
  const n = o.count ?? 90, r = rng(o.seed || 5), pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), seed = new Float32Array(n);
  const sp = o.spread ?? 1.2;
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (r() - 0.5) * sp; pos[i * 3 + 1] = r() * (o.height ?? 4.6); pos[i * 3 + 2] = (r() - 0.5) * sp;
    vel[i * 3] = (r() - 0.5) * 2.2; vel[i * 3 + 1] = 1.2 + r() * 4; vel[i * 3 + 2] = (r() - 0.5) * 2.2; seed[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('vel', new THREE.BufferAttribute(vel, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { life: { value: -1 }, dur: { value: o.dur ?? 1.4 }, color: { value: new THREE.Color(o.color || '#7dffb0').multiplyScalar(o.bright ?? 2.2) }, px: { value: o.pointSize ?? 1 } },
    vertexShader: `attribute vec3 vel; attribute float seed; uniform float life, dur, px; varying float a;
      void main(){ float k = life / dur; vec3 p = position + vel * life * (1.0 - 0.3 * k);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        a = step(0.0, life) * (1.0 - smoothstep(0.35 + seed * 0.4, 1.0, k));
        gl_PointSize = px * (0.5 + seed) * 210.0 / max(1.0, -mv.z); }`,
    fragmentShader: `uniform vec3 color; varying float a; void main(){ vec2 q = abs(gl_PointCoord - 0.5); float s = smoothstep(0.5, 0.3, max(q.x, q.y)); if (a < 0.01) discard; gl_FragColor = vec4(color, s * a); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.noAO = true; if (o.pos) p.position.copy(o.pos); (o.parent || scene).add(p);
  let t0 = 1e9;
  p.fire = (t) => { t0 = t; return p; };
  p.update = (t) => { m.uniforms.life.value = t - t0; p.visible = t >= t0 && t < t0 + m.uniforms.dur.value; };
  return p;
}

// Turns a procedural character to blocks of light: const v = vanisher(ch); v.set(0..1) each frame
export function vanisher(ch, color = '#7dffb0') {
  const u = { uV: { value: 0 }, uC: { value: new THREE.Color(color) } }, fades = [];
  ch.root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material.isMeshBasicMaterial) { o.material = o.material.clone(); fades.push(o.material); return; }
    const m = o.material.clone();
    m.onBeforeCompile = (s) => {
      s.uniforms.uV = u.uV; s.uniforms.uC = u.uC;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vVW;').replace('#include <project_vertex>', '#include <project_vertex>\n vVW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vVW; uniform float uV; uniform vec3 uC;
        float vH(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float vE = vH(floor(vVW * 5.0)) - uV * 1.3 + 0.15;
        if (uV > 0.001 && vE < 0.0) discard;
        totalEmissiveRadiance += uC * smoothstep(0.3, 0.0, vE) * 4.0 * step(0.001, uV);`);
    };
    m.customProgramCacheKey = () => 'vanisher';
    o.material = m;
  });
  return { set(v) { u.uV.value = v; fades.forEach((m) => { m.transparent = true; m.opacity = 1 - Math.min(1, v * 2.5); }); } };
}

// updates a whole list: const air = atmos(dust(...), clouds(...)); air.update(t)
export const atmos = (...items) => ({ update: (t) => items.forEach((i) => i.update && i.update(t)) });
