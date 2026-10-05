import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createLogger } from '../core/Logger';

const log = createLogger('Models');

/**
 * Carrega modelos 3D finais (.glb/.gltf) com cache. Usado quando uma entidade de fase,
 * um item de roupa ou um personagem ganha arte real no lugar do placeholder.
 * Se o arquivo falhar, quem chamou mantém o visual provisório — o jogo nunca quebra.
 */
const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();

export function loadModel(url: string): Promise<THREE.Group> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((gltf) => {
      gltf.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.frustumCulled = true;
      });
      return gltf.scene;
    });
    p.catch((e) => log.warn(`Não carregou o modelo ${url}`, e));
    cache.set(url, p);
  }
  // Cada uso recebe uma cópia (o original fica no cache).
  return p.then((g) => g.clone(true));
}

/** Adiciona o modelo a `parent` quando carregar; chama `onFail` se não der certo. */
export function attachModel(parent: THREE.Object3D, url: string, onFail?: () => void, setup?: (g: THREE.Group) => void) {
  loadModel(url)
    .then((g) => {
      setup?.(g);
      parent.add(g);
    })
    .catch(() => onFail?.());
}
