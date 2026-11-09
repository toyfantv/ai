// Check page for the model library: still t = n shows model n on grass (builders, then files).
//   node render.js stills library 0.5 0 1 2 ...
import * as THREE from 'three';
import { v3 } from '../engine/core.js';
import { BUILD } from '../engine/models.js';
import { model } from '../engine/library.js';
import { initStage, applyEnv, frame, expose, DAY } from '../engine/stage.js';

const SKIP = ['town', 'cardboard_sky', 'kit_skyline', 'kit_crowd', 'sg_larkspur', 'wt_iron_boots', 'wt_paper_slippers', 'wt_diver_belt', 'wt_mitt', 'wt_fire_ladder', 'wt_founders_hall', 'wt_plumbwick', 'wt_brook_yard', 'mb_gold_bead', 'mb_town_beads', 'mb_threads', 'mb_ferry', 'mb_harbour', 'mb_classroom', 'mb_lunchroom'];
export async function setup() {
  const index = await (await fetch('/web/assets/models/index.json')).json();
  const files = Object.keys(index).filter((n) => index[n].type === 'file');
  const ctx = await initStage('library', { models: files });
  const names = [...Object.keys(BUILD).filter((n) => !SKIP.includes(n)), ...files];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#7dbb5a', roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ctx.scene.add(ground);
  let shown = -1, holder = null, r = 8;
  return expose(ctx, (t) => {
    const i = Math.min(names.length - 1, Math.round(t));
    if (i !== shown) {
      if (holder) ctx.scene.remove(holder);
      holder = new THREE.Group(); ctx.scene.add(holder);
      model(names[i], { parent: holder, height: files.includes(names[i]) ? 6 : undefined });
      const b = new THREE.Box3().setFromObject(holder); r = Math.max(4, b.getSize(v3(0, 0, 0)).length() * 0.62);
      holder.position.y = Math.max(0, -b.min.y);
      shown = i;
    }
    applyEnv(ctx, { ...DAY, vig: 0, bloom: 0 });
    frame(ctx, t, { pos: v3(r * 0.8, r * 0.75, r * 2.1), look: v3(0, r * 0.32, 0), fov: 50 }, { steady: true });
    return names[i];
  }, 0.5, { names });
}
