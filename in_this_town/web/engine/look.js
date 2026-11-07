// The "pro" look: the production finish for new episodes (study: reports/Zaylento look study.md in video-farm).
//   ctx = await initStage('ep20', { look: 'pro', models: [...] });
// Ambient occlusion, environment light with coloured bounce, wide soft shadows, neutral tone mapping, a final grade
// (colour, clarity, sharpen) and sub-frame accumulation: motion blur, soft sun shadows and cleaner edges.
// Older episodes stay on 'classic'; RENDER_LOOK=pro|classic overrides either for a test.
import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const GRADE = { saturation: 1.16, contrast: 0.94, lift: 0.012, clarity: 0.42, sharpen: 0.35 };

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, px: { value: new THREE.Vector2(1 / 1080, 1 / 1920) }, saturation: { value: 1 },
    contrast: { value: 1 }, lift: { value: 0 }, clarity: { value: 0 }, sharpen: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 px;
    uniform float saturation, contrast, lift, clarity, sharpen;
    float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    void main(){
      vec4 s = texture2D(tDiffuse, vUv); vec3 c = s.rgb; float L = luma(c);
      float near = 0.0;
      near += luma(texture2D(tDiffuse, vUv + px * vec2( 1.0, 0.0)).rgb); near += luma(texture2D(tDiffuse, vUv + px * vec2(-1.0, 0.0)).rgb);
      near += luma(texture2D(tDiffuse, vUv + px * vec2(0.0,  1.0)).rgb); near += luma(texture2D(tDiffuse, vUv + px * vec2(0.0, -1.0)).rgb);
      near *= 0.25;
      float wide = 0.0;
      for (int i = 0; i < 12; i++) {
        float a = float(i) * 0.5236; float r = (i % 2 == 0) ? 12.0 : 26.0;
        wide += luma(texture2D(tDiffuse, vUv + px * r * vec2(cos(a), sin(a))).rgb);
      }
      wide /= 12.0;
      float mid = 1.0 - pow(abs(L * 2.0 - 1.0), 3.0);      // clarity leaves blacks and whites alone
      c += (L - near) * sharpen + (L - wide) * clarity * mid;
      c = mix(vec3(0.5), c, contrast);
      c = c * (1.0 - lift) + lift;
      c = mix(vec3(luma(c)), c, saturation);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), s.a);
    }`,
};

// the sky's colours as image-based light; a soft sun blob gives bevels and glossy surfaces a highlight
function envScene(e) {
  const s = new THREE.Scene();
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: e.hemiSky }, mid: { value: e.horizon }, low: { value: e.hemiGround }, sun: { value: e.sunColor },
      dir: { value: e.sunDir.clone().normalize() }, sunI: { value: e.sunI } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 d; uniform vec3 top, mid, low, sun, dir; uniform float sunI;
      void main(){ vec3 n = normalize(d);
        vec3 c = n.y > 0.0 ? mix(mid, top, pow(n.y, 0.6)) : mix(mid, low, pow(-n.y, 0.4));
        c += sun * sunI * 2.0 * pow(max(dot(n, dir), 0.0), 24.0);
        gl_FragColor = vec4(c, 1.0); }` });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
  return { s, dispose: () => { m.dispose(); } };
}

export function installLook(ctx, { samples = 1, fps = 30 } = {}) {
  const { renderer, scene, camera, composer, sun } = ctx;
  const pr = window.devicePixelRatio, W = 1080 * pr, H = 1920 * pr;
  renderer.toneMapping = THREE.NeutralToneMapping;       // keeps colour where ACES washes it out
  renderer.shadowMap.type = THREE.PCFShadowMap;           // the only filtered map that honours shadow.radius without VSM's light bleed
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 3.5; sun.shadow.bias = -0.0004;
  const bounce = new THREE.DirectionalLight('#ffffff', 0); scene.add(bounce); scene.add(bounce.target);

  const gtao = new GTAOPass(scene, camera, W, H);
  gtao.updateGtaoMaterial({ radius: 2.4, distanceExponent: 1.2, thickness: 1.2, scale: 1.25, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 });
  gtao.blendIntensity = 1;
  // glows, light shafts and other soft cards aren't surfaces: keep them out of the occlusion
  const ovr = gtao.overrideVisibility.bind(gtao), res = gtao.restoreVisibility.bind(gtao), hid = [];
  gtao.overrideVisibility = () => { ovr(); scene.traverse((o) => { if (o.visible && (o.isSprite || o.userData.noAO)) { o.visible = false; hid.push(o); } }); };
  gtao.restoreVisibility = () => { for (const o of hid) o.visible = true; hid.length = 0; res(); };
  composer.insertPass(gtao, 1);

  const grade = new ShaderPass(GradeShader);
  grade.uniforms.px.value.set(1 / W, 1 / H);
  for (const k of Object.keys(GRADE)) grade.uniforms[k].value = GRADE[k];
  composer.addPass(grade);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const cache = new Map();
  ctx.pro = { gtao, grade, bounce, samples, fps, shutter: 0.5 / fps,
    // called by applyEnv. Palettes blend every frame, so colours are rounded and the maps cached
    env(e) {
      const q = (c) => c.getHex() & 0xf8f8f8;
      const key = [q(e.hemiSky), q(e.horizon), q(e.hemiGround), q(e.sunColor), Math.round(e.sunI * 4), e.sunDir.toArray().map((v) => v.toFixed(1))].join();
      if (!cache.has(key)) {
        const es = envScene(e); cache.set(key, pmrem.fromScene(es.s, 0.03)); es.dispose();
        if (cache.size > 16) { const k = cache.keys().next().value; cache.get(k).dispose(); cache.delete(k); }
      }
      scene.environment = cache.get(key).texture;
      scene.environmentIntensity = e.envI ?? 0.6;
      ctx.hemi.intensity = e.hemiI * 0.5; ctx.amb.intensity = e.amb * 0.4;
      // light that came off the ground, from the side away from the sun
      const d = e.sunDir.clone().normalize();
      bounce.position.set(-d.x, 0.25, -d.z).multiplyScalar(100);
      bounce.color.copy(e.hemiGround).lerp(e.sunColor, 0.25); bounce.intensity = e.bounce ?? e.sunI * 0.22;
      grade.uniforms.saturation.value = e.saturation ?? GRADE.saturation;
      grade.uniforms.contrast.value = e.contrast ?? GRADE.contrast;
      grade.uniforms.clarity.value = e.clarity ?? GRADE.clarity;
    },
  };
  if (samples > 1) installAccum(ctx, W, H);
}

// Sub-frames, newest first: the first is at t itself and sets the captions and overlays. A sub-frame from before a
// cut is left out, so a cut stays clean.
function installAccum(ctx, W, H) {
  const { renderer, composer } = ctx;
  composer.renderToScreen = false;
  const acc = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const add = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'varying vec2 v; uniform sampler2D t; void main(){ gl_FragColor = vec4(texture2D(t, v).rgb, 1.0); }' });
  const out = new THREE.ShaderMaterial({ uniforms: { t: { value: acc.texture }, n: { value: 1 } }, depthTest: false, depthWrite: false,
    vertexShader: add.vertexShader,
    fragmentShader: 'varying vec2 v; uniform sampler2D t; uniform float n; void main(){ gl_FragColor = vec4(texture2D(t, v).rgb / n, 1.0); }' });
  const fsAdd = new FullScreenQuad(add), fsOut = new FullScreenQuad(out);
  ctx.pro.accumulate = (renderAt, t) => {
    const { samples: N, shutter } = ctx.pro;
    renderer.setRenderTarget(acc); renderer.setClearColor(0, 0); renderer.clear(); renderer.setRenderTarget(null);
    let n = 0, first, shot;
    for (let i = 0; i < N; i++) {
      ctx.sub = { i, N };
      const r = renderAt(Math.max(0, t - shutter * (i / N)));
      if (i === 0) { first = r; shot = ctx.shotName; } else if (ctx.shotName !== shot) continue;
      add.uniforms.t.value = composer.readBuffer.texture;
      const ac = renderer.autoClear; renderer.autoClear = false;
      renderer.setRenderTarget(acc); fsAdd.render(renderer); renderer.setRenderTarget(null);
      renderer.autoClear = ac;
      n++;
    }
    ctx.sub = null;
    out.uniforms.n.value = n;
    const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
    fsOut.render(renderer);
    renderer.toneMapping = tm;
    return first;
  };
}

// R2 low-discrepancy points in the unit square, centred: sub-frame jitter
export function jitter(i) {
  return [((0.5 + i * 0.7548776662) % 1) - 0.5, ((0.5 + i * 0.5698402910) % 1) - 0.5];
}
