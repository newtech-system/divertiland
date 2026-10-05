import * as THREE from 'three';
import type { CharacterId } from '../core/types';
import { createLogger } from '../core/Logger';
import type { ResolvedLook } from '../systems/CustomizationManager';
import { CharacterModel } from './character/CharacterModel';

const log = createLogger('Portrait');

/**
 * Gera retratos (imagem do rosto) do personagem com o visual atual — usados no mapa,
 * nos balões de fala e nos cartões de perfil. Renderiza num alvo fora da tela, sem
 * criar outro contexto WebGL.
 */
export class PortraitFactory {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  private target = new THREE.WebGLRenderTarget(256, 256);
  private cache = new Map<string, string>();
  private canvas = document.createElement('canvas');

  constructor(private gl: THREE.WebGLRenderer) {
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#ffc2e0', 2));
    const d = new THREE.DirectionalLight('#ffffff', 1.2);
    d.position.set(1, 2, 3);
    this.scene.add(d);
    this.camera.position.set(0, 1.42, 2.6);
    this.camera.lookAt(0, 1.3, 0);
    this.canvas.width = this.canvas.height = 256;
    this.target.texture.colorSpace = THREE.SRGBColorSpace;
  }

  make(character: CharacterId, look: ResolvedLook): string {
    const key = character + '|' + Object.values(look).map((i) => i?.id).join(',');
    const hit = this.cache.get(key);
    if (hit) return hit;
    try {
      const model = new CharacterModel(character, look);
      model.object.rotation.y = 0.25;
      this.scene.add(model.object);
      const prevTarget = this.gl.getRenderTarget();
      this.gl.setRenderTarget(this.target);
      this.gl.setClearColor(0x000000, 0);
      this.gl.clear();
      this.gl.render(this.scene, this.camera);
      const px = new Uint8Array(256 * 256 * 4);
      this.gl.readRenderTargetPixels(this.target, 0, 0, 256, 256, px);
      this.gl.setRenderTarget(prevTarget);
      model.dispose();
      const ctx = this.canvas.getContext('2d')!;
      const img = ctx.createImageData(256, 256);
      // WebGL lê de baixo para cima: inverte as linhas.
      for (let y = 0; y < 256; y++) {
        img.data.set(px.subarray((255 - y) * 256 * 4, (256 - y) * 256 * 4), y * 256 * 4);
      }
      ctx.clearRect(0, 0, 256, 256);
      ctx.putImageData(img, 0, 0);
      const url = this.canvas.toDataURL('image/png');
      this.cache.set(key, url);
      return url;
    } catch (e) {
      log.warn('Falha ao gerar retrato', e);
      return '';
    }
  }
}
