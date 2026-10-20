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
  private fullCamera?: THREE.PerspectiveCamera;
  private fullTarget?: THREE.WebGLRenderTarget;

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
    return this.render('rosto', character, look, 256, 256, this.camera);
  }

  /**
   * CORPO INTEIRO (seção 12 do prompt de 16/10), para a abertura e material visual.
   * É uma renderização do modelo que o jogo usa de verdade — não é o PNG de produção
   * de 2048 px que ainda está pendente.
   */
  full(character: CharacterId, look: ResolvedLook): string {
    if (!this.fullCamera) {
      this.fullCamera = new THREE.PerspectiveCamera(26, 512 / 1024, 0.1, 20);
      this.fullCamera.position.set(0, 0.95, 4.4);
      this.fullCamera.lookAt(0, 0.82, 0);
      this.fullTarget = new THREE.WebGLRenderTarget(512, 1024);
      this.fullTarget.texture.colorSpace = THREE.SRGBColorSpace;
    }
    return this.render('corpo', character, look, 512, 1024, this.fullCamera, this.fullTarget!);
  }

  private render(
    tipo: string,
    character: CharacterId,
    look: ResolvedLook,
    w: number,
    h: number,
    camera: THREE.PerspectiveCamera,
    target: THREE.WebGLRenderTarget = this.target,
  ): string {
    const key = tipo + '|' + character + '|' + Object.values(look).map((i) => i?.id).join(',');
    const hit = this.cache.get(key);
    if (hit) return hit;
    try {
      const model = new CharacterModel(character, look);
      model.object.rotation.y = 0.25;
      this.scene.add(model.object);
      const prevTarget = this.gl.getRenderTarget();
      this.gl.setRenderTarget(target);
      this.gl.setClearColor(0x000000, 0);
      this.gl.clear();
      this.gl.render(this.scene, camera);
      const px = new Uint8Array(w * h * 4);
      this.gl.readRenderTargetPixels(target, 0, 0, w, h, px);
      this.gl.setRenderTarget(prevTarget);
      model.dispose();
      this.canvas.width = w;
      this.canvas.height = h;
      const ctx = this.canvas.getContext('2d')!;
      const img = ctx.createImageData(w, h);
      // WebGL lê de baixo para cima: inverte as linhas.
      for (let y = 0; y < h; y++) {
        img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      }
      ctx.clearRect(0, 0, w, h);
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
