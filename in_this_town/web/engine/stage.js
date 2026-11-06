// Shared episode framework: renderer, lights, sky, palettes, shots, captions, overlays, thumbnail.
// An episode module calls initStage(), builds its world, then defines renderAt(t) that ends in frame().
import * as THREE from 'three';
import { U, clamp, lerp, easeOut, noise1, v3 } from './core.js';
import { buildSky } from './sky.js';
import { winMat, lampMat } from './town.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const C = (c) => (c && c.isColor ? c : new THREE.Color(c));
export function P(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) out[k] = typeof v === 'string' && v.startsWith('#') ? new THREE.Color(v) : v;
  return out;
}
export function mixP(a, b, k) {
  const o = {};
  for (const key of Object.keys(a)) {
    const x = a[key], y = b[key] ?? x;
    if (x && x.isColor) o[key] = x.clone().lerp(C(y), k);
    else if (x && x.isVector3) o[key] = x.clone().lerp(y, k);
    else if (typeof x === 'number') o[key] = lerp(x, y, k);
    else o[key] = k < 0.5 ? x : y;
  }
  return o;
}

// Common palettes (episodes override fields with {...DAY, ...})
export const DAY = P({ top: '#3a8ee6', horizon: '#c4e8ff', haze: '#c4e8ff', sunColor: '#fff2dc', sunI: 2.3, sunDir: v3(0.35, 0.8, 0.45),
  sunDisc: 1, sunSize: 1, stars: 0, moon: 0, hemiSky: '#bfe3ff', hemiGround: '#6a9a5a', hemiI: 0.95, amb: 0.15,
  caus: '#ffffff', causI: 0, exposure: 0.95, vig: 0.22, win: 0, lamp: 0.15, fogNear: 230, fogFar: 780, bloom: 0.22 });
export const NIGHT = P({ top: '#060b26', horizon: '#1a2550', haze: '#141d40', sunColor: '#8fa6ff', sunI: 0.5, sunDir: v3(-0.3, 0.7, -0.6),
  sunDisc: 0, sunSize: 1, stars: 1, moon: 1, hemiSky: '#2a3a80', hemiGround: '#0a1020', hemiI: 0.6, amb: 0.12,
  caus: '#ffffff', causI: 0, exposure: 1.05, vig: 0.45, win: 1.4, lamp: 3.0, fogNear: 160, fogFar: 600, bloom: 0.5 });
export const DUSK = P({ top: '#2a2f6e', horizon: '#ff9a6a', haze: '#d89a8a', sunColor: '#ffb07a', sunI: 1.7, sunDir: v3(0.8, 0.15, -0.4),
  sunDisc: 1, sunSize: 1.4, stars: 0.2, moon: 0, hemiSky: '#c8a0c0', hemiGround: '#4a4a40', hemiI: 0.9, amb: 0.14,
  caus: '#ffffff', causI: 0, exposure: 1.0, vig: 0.35, win: 0.8, lamp: 1.2, fogNear: 200, fogFar: 700, bloom: 0.35 });

export async function initStage(ep) {
  const TL = await (await fetch(`/build/${ep}/timeline.json`)).json();
  await document.fonts.load('900 100px ITTInter');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(1080, 1920);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('gl').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#c4e8ff', 230, 780);
  const camera = new THREE.PerspectiveCamera(60, 1080 / 1920, 0.1, 6000);
  const hemi = new THREE.HemisphereLight('#bfe3ff', '#6a9a5a', 1); scene.add(hemi);
  const amb = new THREE.AmbientLight('#ffffff', 0.15); scene.add(amb);
  const sun = new THREE.DirectionalLight('#fff2dc', 2.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 500 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
  scene.add(sun); scene.add(sun.target);
  const sky = buildSky(scene);
  U.uCausticStrength.value = 0;
  const L = (i) => TL.lines[i];
  const el = (id) => document.getElementById(id);
  // post: MSAA HDR target -> bloom -> tone map/sRGB
  const pr = window.devicePixelRatio;
  const rt = new THREE.WebGLRenderTarget(1080 * pr, 1920 * pr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr); composer.setSize(1080, 1920);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1080 * pr, 1920 * pr), 0.3, 0.4, 2.2);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  const ctx = { renderer, scene, camera, hemi, amb, sun, sky, TL, L, dur: TL.duration, composer, bloom,
    cap: el('cap'), black: el('black'), flash: el('flash'), grade: el('grade'), thumbMode: false };
  return ctx;
}

export function applyEnv(ctx, e) {
  const { scene, hemi, amb, sun, sky, renderer } = ctx;
  const su = sky.uniforms;
  su.uTop.value.copy(e.top); su.uHorizon.value.copy(e.horizon); su.uBottom.value.copy(e.haze);
  su.uSunDir.value.copy(e.sunDir).normalize(); su.uSunColor.value.copy(e.sunColor);
  su.uSunI.value = e.sunDisc; su.uSunSize.value = 0.035 * e.sunSize; su.uStars.value = e.stars; su.uMoon.value = e.moon;
  scene.fog.color.copy(e.haze); scene.fog.near = e.fogNear; scene.fog.far = e.fogFar;
  if (!scene.background || !scene.background.isColor) scene.background = new THREE.Color();
  scene.background.copy(e.haze);
  hemi.color.copy(e.hemiSky); hemi.groundColor.copy(e.hemiGround); hemi.intensity = e.hemiI;
  amb.intensity = e.amb;
  sun.color.copy(e.sunColor); sun.intensity = e.sunI;
  U.uCausticColor.value.copy(e.caus); U.uCausticStrength.value = e.causI;
  winMat.emissiveIntensity = e.win; lampMat.emissiveIntensity = e.lamp;
  renderer.toneMappingExposure = e.exposure;
  if (ctx.bloom) ctx.bloom.strength = e.bloom ?? 0.4;
  ctx.env = e;
}

// shots: [{ name, t0: () => sec, t1: () => sec, f: (u, t) => ({ pos, look, fov, roll? }) }]
export function shotAt(shots, t) {
  const sh = shots.find((s) => t >= s.t0() && t < s.t1()) || shots[shots.length - 1];
  const u = clamp((t - sh.t0()) / Math.max(1e-6, sh.t1() - sh.t0()));
  return { name: sh.name, ...sh.f(u, t) };
}

function captionAt(ctx, t, hideAfter) {
  const { cap, TL } = ctx;
  const c = TL.captions.find((c) => t >= c.start && t < c.end);
  if (!c || t >= hideAfter || ctx.thumbMode) { if (!ctx.thumbMode) cap.innerHTML = ''; return; }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let html = esc(c.text);
  const hls = c.hls || (c.hl ? [[c.hl, c.color]] : []);
  for (const [phrase, color] of hls) {
    if (phrase === '*') { html = `<span class="${color}">${html}</span>`; break; }
    const e = esc(phrase);
    if (html.includes(e)) html = html.replace(e, `<span class="${color}">${e}</span>`);
  }
  if (cap.dataset.k !== c.text + c.start) { cap.innerHTML = html; cap.dataset.k = c.text + c.start; }
  const a = clamp((t - c.start) / 0.16);
  const s = a < 1 ? lerp(0.55, 1.08, easeOut(a)) : 1.08 - 0.08 * clamp((t - c.start - 0.16) / 0.1);
  const big = hls.length ? 1.06 : 1;
  cap.style.transform = `scale(${s * big}) rotate(${(noise1(c.start * 7) * 1.5).toFixed(2)}deg)`;
  cap.style.opacity = String(clamp(a * 2));
}

const tmp = new THREE.Vector3();
// Finish a frame: camera (+shake), shadow focus, overlays, captions, render.
export function frame(ctx, t, sh, o = {}) {
  const { camera, sun, renderer, scene } = ctx;
  camera.position.copy(sh.pos); camera.fov = sh.fov || 60; camera.updateProjectionMatrix();
  const look = sh.look.clone();
  const shake = o.shake || 0;
  if (!o.steady) {   // gentle handheld drift
    const dd = camera.position.distanceTo(look) * 0.0045;
    look.x += noise1(t * 0.55 + 11) * dd; look.y += noise1(t * 0.47 + 23) * dd * 0.7;
    camera.position.y += noise1(t * 0.4 + 5) * Math.min(0.06, dd * 0.3);
  }
  if (shake > 0) {
    const d = camera.position.distanceTo(look) * 0.012 * shake;
    look.x += noise1(t * 23) * d; look.y += noise1(t * 19 + 5) * d; look.z += noise1(t * 21 + 9) * d * 0.5;
  }
  camera.up.set(0, 1, 0);
  if (sh.roll) camera.up.set(Math.sin(sh.roll), Math.cos(sh.roll), 0);
  camera.lookAt(look);
  camera.getWorldDirection(tmp);
  const focus = camera.position.clone().add(tmp.multiplyScalar(30)); focus.y = Math.max(0, Math.min(focus.y, 40));
  sun.target.position.copy(focus);
  const sd = ctx.env ? ctx.env.sunDir.clone().normalize() : v3(0.3, 0.8, 0.4);
  sun.position.copy(focus).add(sd.multiplyScalar(180));
  sun.castShadow = o.shadows !== false;
  captionAt(ctx, t, o.captionsOff ?? 1e9);
  ctx.flash.style.opacity = (o.flash || 0).toFixed(3);
  ctx.flash.style.background = o.flashColor || '#ffffff';
  ctx.black.style.opacity = String(o.black || 0);
  const vig = (ctx.env ? ctx.env.vig : 0.3) + (o.vig || 0);
  ctx.grade.style.background = `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vig.toFixed(2)}) 100%)` +
    (o.tint ? `, ${o.tint}` : '');
  ctx.sky.uniforms.uTime.value = t;
  U.uTime.value = t;
  if (ctx.composer) ctx.composer.render(); else renderer.render(scene, camera);
}

// expose to the renderer; thumbText is drawn large at the top
export function expose(ctx, renderAt, thumbT, events = {}) {
  window.__render = renderAt;
  window.__events = events; window.__duration = ctx.dur;
  window.__thumb = (text) => {
    ctx.thumbMode = true; renderAt(thumbT);
    ctx.cap.innerHTML = `<span class="red">${text}</span>`; ctx.cap.style.top = '170px'; ctx.cap.style.fontSize = '150px';
    ctx.cap.style.transform = 'rotate(-2deg)'; ctx.cap.style.opacity = '1';
  };
  renderAt(0);
  return { duration: ctx.dur, events };
}
