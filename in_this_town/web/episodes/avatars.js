// Avatar check: every real Roblox avatar in web/assets/avatars beside its procedural CAST look.
//   node render.js stills avatars 0.5 0.5 1.5 2.5 3.5 4.5 5.5
// t in [0,1) idle, [1,2) walk, [2,3) wave, [3,4) point, [4,5) sit, [5,6) run + head turn.
// ?only=<key> renders one avatar; whole seconds (t = 0, 1, ...) show it from behind.
import * as THREE from 'three';
import { v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { CAST } from '../engine/cast.js';
import { hasAvatar } from '../engine/roblox.js';
import { initStage, applyEnv, frame, expose, DAY } from '../engine/stage.js';

const POSES = ['idle', 'walk', 'wave', 'point', 'sit', 'run'];
export async function setup() {
  const ctx = await initStage('avatars', { avatars: Object.values(CAST).map((c) => c.avatar).filter(Boolean) });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#7dbb5a', roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.35; ground.receiveShadow = true; ctx.scene.add(ground);
  const only = new URLSearchParams(location.search).get('only');
  const keys = Object.keys(CAST).filter((k) => hasAvatar(CAST[k].avatar) && (!only || k === only));
  const pairs = keys.map((k, i) => {
    const real = makeCharacter(CAST[k]);
    const proc = makeCharacter({ ...CAST[k], avatar: null });
    const x = (i - (keys.length - 1) / 2) * 9;
    real.root.position.set(x - 2, 0.35, 0); proc.root.position.set(x + 2, 0.35, 0);
    ctx.scene.add(real.root, proc.root);
    return [real, proc];
  });
  // seat for the sit pose
  const bench = new THREE.Mesh(new THREE.BoxGeometry(Math.max(9, keys.length * 9), 0.3, 1.4), new THREE.MeshStandardMaterial({ color: '#8a6a4a' }));
  bench.position.set(0, 0.35 + 1.0, -0.4); bench.visible = false; ctx.scene.add(bench);
  const width = Math.max(1, keys.length) * 9;
  return expose(ctx, (t) => {
    applyEnv(ctx, DAY);
    const i = Math.min(POSES.length - 1, Math.floor(t)), behind = t - Math.floor(t) < 0.25;
    bench.visible = POSES[i] === 'sit';
    for (const [real, proc] of pairs) for (const c of [real, proc]) {
      pose(c, POSES[i], t * 0.7 + 0.3, { headYaw: POSES[i] === 'run' ? 0.6 : 0 });
      c.root.rotation.y = behind ? Math.PI : 0;
    }
    // fit the whole row: horizontal half-angle of a 28 degree vertical fov at 9:16
    const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(14)) * 1080 / 1920);
    const dist = Math.max(7.5, width * 0.55) / Math.tan(hf);
    frame(ctx, t, { pos: v3(0, 3.6, dist), look: v3(0, 2.9, 0), fov: 28 }, { steady: true });
    return 'avatars';
  }, 0.5, { avatars: keys });
}
