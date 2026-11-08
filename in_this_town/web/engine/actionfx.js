// Action-anime effects (Episode 32 on; the user's rule for every action video, 2026-11-07): focus / speed lines, impact frames,
// weapon trails. Everything is a pure function of the frame's time, so parallel workers agree.
//
//   const fx = installActionFX(ctx);                 // in setup, after initStage
//   fx.set(t, { focus: k, cx, cy, streak: k, angle, impact: 0 | 1 | 2 });   // in renderAt, once per frame (skipped on later sub-frames)
//   const tr = weaponTrail({ color: '#c8b6ff', n: 10 }); scene.add(tr);
//   tr.set([{ base, tip }, ...]);                    // newest first: the blade's base and tip at t, t - dt, t - 2 dt ...
//
// focus: anime "concentration lines" converging on (cx, cy) (0..1 of the frame), a clear oval round the subject; streak: parallel
// speed lines across the frame at `angle` (radians, 0 = horizontal) for dashes and whip pans. Lines re-draw 12 times a second, as
// in anime. impact 1: a two-tone (white on black) frame with heavy focus lines; impact 2: the same, inverted (black on white);
// impact 3: film negative (the colours inverted) with dark focus lines, for a held impact frame in a speed edit.
import * as THREE from 'three';

const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function installActionFX(ctx) {
  const stage = document.getElementById('stage'), gl = document.getElementById('gl'), before = document.getElementById('flash');
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920;
  Object.assign(cv.style, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', pointerEvents: 'none' });
  stage.insertBefore(cv, before);
  const g = cv.getContext('2d');
  let last = '';
  function focusLines(k, cx, cy, seed, col, inner) {
    const X = cx * 1080, Y = cy * 1920, R = 2300, n = 150;
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const h = hash(seed * 31 + i), h2 = hash(seed * 17 + i * 3.1);
      if (h2 > 0.35 + 0.6 * k) continue;
      const a = (i + h * 0.8) / n * Math.PI * 2, w = 0.0025 + 0.009 * hash(i * 7.3 + seed);
      const r0 = inner * (0.85 + 0.6 * hash(i * 1.7 + seed * 5)) * (1.15 - 0.3 * k);
      const ax = Math.cos(a), ay = Math.sin(a);
      g.beginPath();
      g.moveTo(X + ax * r0 * 540, Y + ay * r0 * 900);
      g.lineTo(X + Math.cos(a - w) * R, Y + Math.sin(a - w) * R);
      g.lineTo(X + Math.cos(a + w) * R, Y + Math.sin(a + w) * R);
      g.closePath(); g.fill();
    }
  }
  function streaks(k, angle, seed, col) {
    const n = Math.round(40 * k), c = Math.cos(angle), s = Math.sin(angle);
    g.save(); g.translate(540, 960); g.rotate(angle); g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const y = (hash(seed * 13 + i) - 0.5) * 2600, x = (hash(seed * 7 + i * 2.3) - 0.5) * 2000, len = 300 + 900 * hash(i + seed * 3), th = 1.5 + 4 * hash(i * 5.1 + seed);
      if (Math.abs(y) < 260 && hash(i * 9.7) < 0.7) continue;   // keep the middle mostly clear: the subject
      g.globalAlpha = 0.35 + 0.5 * hash(i * 3.3 + seed);
      g.fillRect(x - len / 2, y, len, th);
    }
    g.restore(); g.globalAlpha = 1; void c; void s;
  }
  const fx = {
    canvas: cv,
    set(t, o = {}) {
      if (ctx.sub && ctx.sub.i !== 0) return;
      const focus = o.focus || 0, streak = o.streak || 0, impact = o.impact || 0;
      const seed = Math.floor(t * 12) + (o.seed || 0);
      const key = [focus.toFixed(2), streak.toFixed(2), impact, seed, o.cx, o.cy, o.angle].join();
      gl.style.filter = impact === 1 ? 'grayscale(1) brightness(2.6) contrast(7)' : impact === 2 ? 'grayscale(1) brightness(2.6) contrast(7) invert(1)' : impact === 3 ? 'invert(1) brightness(0.38) contrast(1.06) saturate(1.5)' : '';
      if (key === last) return; last = key;
      g.clearRect(0, 0, 1080, 1920);
      const cx = o.cx ?? 0.5, cy = o.cy ?? 0.45;
      if (impact) {
        focusLines(1, cx, cy, seed, impact === 2 ? 'rgba(255,255,255,0.9)' : impact === 3 ? 'rgba(10,6,20,0.7)' : 'rgba(0,0,0,0.9)', impact === 3 ? 0.62 : 0.36);
        return;
      }
      if (focus > 0.01) {
        g.globalAlpha = Math.min(1, focus * 1.2);
        focusLines(focus, cx, cy, seed, o.color || 'rgba(235,240,255,0.42)', o.inner ?? 0.68);
        g.globalAlpha = 1;
      }
      if (streak > 0.01) streaks(streak, o.angle || 0, seed, o.streakColor || 'rgba(225,232,255,0.5)');
    },
  };
  return fx;
}

// A ribbon behind a moving blade, drawn from base to tip over the last few samples; it fades with age and with low speed, so a
// held sword has no trail and a fast swing paints an arc. Additive: brightness is the opacity.
export function weaponTrail(o = {}) {
  const n = o.n ?? 10, col = new THREE.Color(o.color || '#d6e4ff');
  const pos = new Float32Array((n + 1) * 2 * 3), clr = new Float32Array((n + 1) * 2 * 3), idx = [];
  for (let i = 0; i < n; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(clr, 3)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false, fog: false }));
  m.frustumCulled = false; m.userData.noAO = true; m.renderOrder = 5;
  const full = o.fullSpeed ?? 16, min = o.minSpeed ?? 5, gain = o.gain ?? 1.4, dt = o.dt ?? 1 / 60;
  // samples: newest first, [{ base, tip }]
  m.set = (samples) => {
    let any = false;
    for (let i = 0; i <= n; i++) {
      const s = samples[Math.min(i, samples.length - 1)], age = 1 - i / n;
      const b = s.tip.clone().lerp(s.base, age);
      pos.set([b.x, b.y, b.z], i * 6); pos.set([s.tip.x, s.tip.y, s.tip.z], i * 6 + 3);
      const nx = samples[Math.min(i + 1, samples.length - 1)];
      const rel = s.tip.clone().sub(nx.tip); if (s.root && nx.root) rel.sub(s.root.clone().sub(nx.root));
      const sp = rel.length() / dt, k = Math.min(1, Math.max(0, (sp - min) / (full - min)));
      const a = k * age * gain; if (a > 0.02) any = true;
      clr.set([col.r * a * 0.15, col.g * a * 0.15, col.b * a * 0.15], i * 6); clr.set([col.r * a, col.g * a, col.b * a], i * 6 + 3);
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeBoundingSphere();
    m.visible = any;
  };
  m.visible = false;
  return m;
}
