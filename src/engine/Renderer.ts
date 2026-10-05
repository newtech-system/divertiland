import * as THREE from 'three';
import { createLogger } from '../core/Logger';
import { getViewport, initViewport, onViewportChange } from '../ui/viewport';

const log = createLogger('Renderer');

export type Quality = 'low' | 'medium' | 'high';

/**
 * Um único WebGLRenderer para o jogo inteiro (um contexto WebGL só — importante em celulares).
 * Fases desenham em tela cheia; telas de menu podem desenhar o personagem num "palco"
 * (retângulo) usando viewport/scissor, sem criar outro canvas.
 */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly gl: THREE.WebGLRenderer;
  private quality: Quality = 'medium';
  width = 1;
  height = 1;
  onResize?: (w: number, h: number) => void;

  constructor(container: HTMLElement) {
    this.gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.canvas = this.gl.domElement;
    this.canvas.id = 'game-canvas';
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.setClearColor(0x000000, 0);
    container.appendChild(this.canvas);
    // O tamanho vem da área REALMENTE visível (ui/viewport.ts), não de window.innerHeight:
    // em celular a barra do navegador e o teclado ficam por cima e cortariam o jogo.
    initViewport();
    onViewportChange(() => this.resize());
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      log.warn('Contexto WebGL perdido — aguardando restauração.');
    });
    this.resize();
  }

  setQuality(q: Quality) {
    this.quality = q;
    this.resize();
  }

  get pixelRatioCap() {
    return this.quality === 'low' ? 1 : this.quality === 'medium' ? 1.5 : 2;
  }

  resize() {
    const { width: w, height: h } = getViewport();
    this.width = w;
    this.height = h;
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.pixelRatioCap));
    this.gl.setSize(w, h, false);
    this.onResize?.(w, h);
  }

  clear() {
    // O fundo de uma fase muda a cor de limpeza interna do three.js; nos menus queremos transparente.
    this.gl.setClearColor(0x000000, 0);
    this.gl.setScissorTest(false);
    this.gl.setViewport(0, 0, this.width, this.height);
    this.gl.clear();
  }

  renderFull(scene: THREE.Scene, camera: THREE.Camera) {
    this.gl.setScissorTest(false);
    this.gl.setViewport(0, 0, this.width, this.height);
    this.gl.render(scene, camera);
  }

  /** Desenha só dentro do retângulo (coordenadas CSS da janela). */
  renderInRect(scene: THREE.Scene, camera: THREE.PerspectiveCamera, rect: DOMRect) {
    const x = rect.left;
    const y = this.height - rect.bottom;
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    this.gl.setClearColor(0x000000, 0);
    this.gl.setScissorTest(true);
    this.gl.setScissor(x, y, w, h);
    this.gl.setViewport(x, y, w, h);
    this.gl.render(scene, camera);
    this.gl.setScissorTest(false);
  }
}
