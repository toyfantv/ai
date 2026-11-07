// The shared model library: buildings, vehicles, props, environments and avatars, by name.
//   ctx = await initStage('ep20', { models: ['package_box', 'old_truck', 'farm_maya'] });
//   const box = model('package_box', { parent: scene });
// Only what an episode names is loaded or goes in its pod bundle. List it: python tools/models.py list
// Catalogue: web/assets/models/index.json (builders in engine/models.js, files in web/assets/models/<name>/).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BUILD } from './models.js';
import { makeCharacter } from './character.js';
import { farm } from './farm_cast.js';

const BASE = '/web/assets/models/';
const FILES = new Map();
let INDEX = null;

export async function loadModels(names = []) {
  if (!names.length) return;
  INDEX = INDEX || await (await fetch(BASE + 'index.json')).json();
  await Promise.all(names.filter((n) => INDEX[n] && INDEX[n].type === 'file').map(async (n) => {
    const e = INDEX[n];
    const gltf = await new GLTFLoader().loadAsync(`${BASE}${e.local ? 'local/' : ''}${n}/${e.file}`);
    gltf.scene.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    FILES.set(n, gltf.scene);
  }));
}

// A new instance. Builders take their own options (see engine/models.js); files take parent and height (in studs).
export function model(name, o = {}) {
  if (name.startsWith('farm_')) {
    const c = makeCharacter(farm(name.slice(5), o));
    if (o.parent) o.parent.add(c.root);
    return c;
  }
  if (BUILD[name]) return BUILD[name](o);
  const src = FILES.get(name);
  if (!src) throw new Error(`model ${name}: not in the library, or not named in initStage(ep, { models })`);
  const m = src.clone(true);
  if (o.height) {
    const b = new THREE.Box3().setFromObject(m);
    m.scale.multiplyScalar(o.height / (b.max.y - b.min.y));
  }
  if (o.parent) o.parent.add(m);
  return m;
}
