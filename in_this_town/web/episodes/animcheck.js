// Clip check: characters side by side, each playing a clip with a sword in hand (anims.js + blades.js).
//   RENDER_QUERY="clips=gs_idle,guard,gs_attack&av=farm_ep32_rowan&armor=2" node render.js stills animcheck 0.5 0.2 0.6 1.0
// t = the clip time; armor=<i> puts the armour on character i (its body hidden), cam=side|front|top
import * as THREE from 'three';
import { v3 } from '../engine/core.js';
import { makeCharacter } from '../engine/character.js';
import { loadAlti } from '../engine/altiface.js';
import { initStage, applyEnv, frame, expose, DAY } from '../engine/stage.js';
import { loadAnimSet, sample, applyPose, holdProp, aimArm, propPoint, KEYED } from '../engine/anims.js';
import { blackSword, whiteBlade, armorSuit } from '../engine/blades.js';

export async function setup() {
  const q = new URLSearchParams(location.search);
  const clips = (q.get('clips') || 'gs_idle,guard,gs_attack').split(','), av = q.get('av') || 'farm_ep32_rowan', arm = q.get('armor');
  const ctx = await initStage('animcheck', { look: 'pro', avatars: [av] });
  await loadAnimSet('sword_set'); await loadAlti(['neutral']);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#7dbb5a', roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ctx.scene.add(ground);
  const grid = new THREE.GridHelper(60, 30, '#335', '#557'); grid.position.y = 0.02; ctx.scene.add(grid);
  const list = clips.map((c, i) => {
    const ch = makeCharacter({ avatar: av, alti: true, skin: '#e9b994', caustic: false }); ctx.scene.add(ch.root);
    ch.root.position.set((i - (clips.length - 1) / 2) * 8, 0, 0);
    const armored = arm !== null && +arm === i;
    const sw = armored ? whiteBlade() : blackSword();
    let suit = null; if (armored) { suit = armorSuit(ch); ch.root.traverse((o) => { if (o.isMesh && !o.userData.armor && !o.userData.alti) o.visible = false; }); if (ch.faceSheet) ch.faceSheet.visible = false; }
    return { ch, c, sw, suit };
  });
  return expose(ctx, (t) => {
    applyEnv(ctx, DAY);
    for (const { ch, c, sw, suit } of list) {
      ch.reset(); const P = sample(c, t); applyPose(ch, P, { travel: 0 }); ch.setFace && ch.setFace('neutral');
      holdProp(ch, 0, sw, P); if (!/^ss_/.test(c)) aimArm(ch, 1, propPoint(sw, sw.hilt2));
      if (suit) suit.wind(t, 1);
    }
    const cam = q.get('cam') || 'front', W = clips.length * 8;
    const D = W * 2.5 + 8, pos = cam === 'side' ? v3(D, 4.5, 0.01) : cam === 'top' ? v3(0, D, 2) : cam === 'q' ? v3(D * 0.7, 6, D * 0.7) : v3(0, 4.6, D);
    frame(ctx, t, { pos, look: v3(0, 3.6, 0), fov: 40 }, { steady: true });
    return 'animcheck';
  }, 0.5, {});
}
