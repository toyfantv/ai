// Avatar check for the farm library: still t = n shows avatar n three times: front, one arm up and striding, from behind.
//   python tools/farm_avatars.py sheet
import * as THREE from 'three';
import { v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { initStage, applyEnv, frame, expose, DAY } from '../engine/stage.js';

export async function setup() {
  const ctx = await initStage('roster', { avatars: 'all' });
  const keys = await (await fetch('/web/assets/avatars/roster.json')).json();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#7dbb5a', roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ctx.scene.add(ground);
  let shown = -1, row = [];
  return expose(ctx, (t) => {
    const i = Math.min(keys.length - 1, Math.round(t));
    if (i !== shown) {
      row.forEach((c) => ctx.scene.remove(c.root));
      row = [0, 1, 2].map((k) => { const c = makeCharacter({ avatar: keys[i], skin: '#ffffff', shirt: '#ffffff', pants: '#ffffff', shoes: '#ffffff', hair: '#ffffff', caustic: false }); c.root.position.set((k - 1) * 5.2, 0, 0); ctx.scene.add(c.root); return c; });
      shown = i;
    }
    applyEnv(ctx, { ...DAY, vig: 0, bloom: 0 });
    pose(row[0], 'idle', 0.3);
    pose(row[1], 'wave', 0.6); row[1].legs[0].rotation.x = -0.5; row[1].legs[1].rotation.x = 0.5; row[1].root.rotation.y = 0.5;
    pose(row[2], 'walk', 0.4); row[2].root.rotation.y = Math.PI;
    frame(ctx, t, { pos: v3(0, 3.4, 27), look: v3(0, 3.0, 0), fov: 56 }, { steady: true });
    return 'roster';
  }, 0.5, {});
}
