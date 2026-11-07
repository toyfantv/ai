// Alti face check: avatars with animated faces, close, one expression per second, then from the side.
//   RENDER_QUERY=only=farm_a,farm_b node render.js stills altifaces 0.5 0.5 1.5 2.5 3.5 4.5 5.5
// Every face used in an episode gets a close look here (no double faces, nothing floating or cut by the hair).
import * as THREE from 'three';
import { v3 } from '../engine/core.js';
import { makeCharacter, pose } from '../engine/character.js';
import { loadAlti } from '../engine/altiface.js';
import { hasAvatar } from '../engine/roblox.js';
import { initStage, applyEnv, frame, expose, DAY } from '../engine/stage.js';

const FACES = ['neutral', 'scared', 'shocked', 'nervous', 'terrified', 'happy'];
export async function setup() {
  const want = (new URLSearchParams(location.search).get('only') || 'farm_jake').split(',');
  const ctx = await initStage('altifaces', { look: 'pro', avatars: want });
  await loadAlti(FACES);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#7dbb5a', roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ctx.scene.add(ground);
  const keys = want.filter(hasAvatar), cols = Math.min(3, keys.length), rows = Math.ceil(keys.length / cols);
  const list = keys.map((k, i) => {
    const c = makeCharacter({ avatar: k, alti: true, caustic: false }); ctx.scene.add(c.root);
    c.root.position.set((i % cols - (cols - 1) / 2) * 4.2, 0, -Math.floor(i / cols) * 0);
    return c;
  });
  return expose(ctx, (t) => {
    applyEnv(ctx, DAY);
    const i = Math.min(FACES.length - 1, Math.floor(t));
    for (const c of list) { pose(c, 'idle', 0.3); c.setFace(FACES[i]); c.root.rotation.y = t >= 6 ? 0.9 : 0; }
    frame(ctx, t, { pos: v3(0, 4.6, keys.length > 1 ? 13 * keys.length : 7), look: v3(0, keys.length > 1 ? 3 : 4.6, 0), fov: 34 }, { steady: true });
    return 'altifaces';
  }, 0.5, { avatars: keys });
}
