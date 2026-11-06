// Cast lineup check: t = i shows portrait i, t = 10 shows everyone.
import * as THREE from 'three';
import { v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { CAST } from '../engine/cast.js';
import { buildTown } from '../engine/town.js';
import { initStage, applyEnv, frame, expose, DAY } from '../engine/stage.js';
let ctx; const chars = [];
export async function setup() {
  ctx = await initStage('ep07');
  buildTown(ctx.scene, { sign: null, house: false });
  Object.keys(CAST).forEach((k, i) => { const c = makeCharacter(CAST[k]); c.root.position.set(-18 + i * 4, 0.35, 0); ctx.scene.add(c.root); c.setFace('smile'); pose(c, 'idle', 0); chars.push(c); });
  return expose(ctx, (t) => {
    applyEnv(ctx, DAY);
    const i = Math.floor(t); chars.forEach((c, j) => { pose(c, 'idle', 0.5 + j); c.root.rotation.y = 0.35; });
    const sh = i < 10 ? { pos: v3(-18 + i * 4 + 1.6, 5.6, 6.4), look: v3(-18 + i * 4, 4.4, 0), fov: 40 } : { pos: v3(0, 6, 34), look: v3(0, 3.5, 0), fov: 50 };
    frame(ctx, t, sh, {}); return 'lineup';
  }, 0, {});
}
