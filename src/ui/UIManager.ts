import type { GameManager } from '../core/GameManager';
import { clear, h } from './dom';

/** Uma tela (mapa, loja, HUD...). */
export abstract class Screen {
  el!: HTMLElement;
  constructor(protected game: GameManager) {}
  abstract build(): HTMLElement;
  /** Elemento onde o palco 3D (personagem) deve aparecer, se houver. */
  stage(): HTMLElement | null {
    return null;
  }
  onShow(): void {}
  onHide(): void {}
  update(_dt: number): void {}
}

/**
 * UIManager (seção 33): troca de telas, modais e avisos rápidos.
 * Toda a interface é HTML/CSS por cima do canvas 3D — fica nítida em qualquer tela,
 * acessível e fácil de adaptar para celular/tablet.
 */
export class UIManager {
  readonly root: HTMLElement;
  current: Screen | null = null;
  private modals: HTMLElement[] = [];
  private toastLayer: HTMLElement;
  private screenLayer: HTMLElement;

  constructor(
    container: HTMLElement,
    private game: GameManager,
  ) {
    this.root = h('div', { id: 'ui' });
    this.screenLayer = h('div', { class: 'screen-layer', style: 'position:absolute;inset:0;pointer-events:none' });
    this.toastLayer = h('div', { class: 'toast-layer' });
    this.root.append(this.screenLayer, this.toastLayer);
    container.appendChild(this.root);
  }

  show(screen: Screen): Screen {
    this.closeAllModals();
    if (this.current) {
      this.current.onHide();
      this.current.el.remove();
    }
    this.current = screen;
    screen.el = screen.build();
    if (!screen.el.classList.contains('passthrough')) screen.el.style.pointerEvents = 'auto';
    this.screenLayer.appendChild(screen.el);
    screen.onShow();
    this.game.showroom.attach(screen.stage());
    return screen;
  }

  /** Abre um modal. Retorna uma função para fechá-lo. */
  modal(content: HTMLElement, opts: { onClose?: () => void; closable?: boolean } = {}): () => void {
    const back = h('div', { class: 'modal-back' });
    const close = () => {
      if (!back.isConnected) return;
      back.remove();
      this.modals = this.modals.filter((m) => m !== back);
      opts.onClose?.();
    };
    if (opts.closable !== false) {
      back.addEventListener('pointerdown', (e) => {
        if (e.target === back) {
          this.game.audio.play('back');
          close();
        }
      });
      const x = h('button', { class: 'btn round white small close', 'aria-label': 'Fechar', onclick: () => (this.game.audio.play('back'), close()) }, '✖');
      content.appendChild(x);
    }
    content.classList.add('modal');
    back.appendChild(content);
    this.root.appendChild(back);
    this.modals.push(back);
    return close;
  }

  get hasModal() {
    return this.modals.length > 0;
  }

  closeAllModals() {
    for (const m of this.modals) m.remove();
    this.modals = [];
  }

  toast(icon: string, text: string) {
    const t = h('div', { class: 'toast' }, h('span', { class: 'ico' }, icon), text);
    this.toastLayer.appendChild(t);
    setTimeout(() => t.remove(), 2700);
    while (this.toastLayer.children.length > 3) this.toastLayer.firstChild!.remove();
  }

  clearToasts() {
    clear(this.toastLayer);
  }
}
