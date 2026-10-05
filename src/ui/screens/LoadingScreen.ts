import type { GameManager } from '../../core/GameManager';
import { h } from '../dom';
import { Screen } from '../UIManager';

const TIPS = [
  'Dica: olhe em volta, sempre tem segredos escondidos! 🔍',
  'Dica: ursinhos dourados valem estrela! 🧸',
  'Dica: no trampolim, pule várias vezes para ir mais alto! 🤸',
  'Dica: caiu? Tudo bem, você volta rapidinho! 🚩',
  'Dica: Divertis compram roupas novas na loja! 🛍️',
];

export class LoadingScreen extends Screen {
  constructor(
    game: GameManager,
    private title: string,
    private icon: string,
  ) {
    super(game);
  }
  build(): HTMLElement {
    return h(
      'div',
      { class: 'screen loading' },
      h('div', { class: 'spinner' }, this.icon),
      h('h1', { class: 'title-xl' }, this.title),
      h('div', { class: 'tip' }, TIPS[Math.floor(Math.random() * TIPS.length)]),
    );
  }
}
