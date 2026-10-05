import { h } from '../dom';
import { Screen } from '../UIManager';
import { btn, portraitImg } from '../components/widgets';

/** Tela inicial. */
export class TitleScreen extends Screen {
  build(): HTMLElement {
    const g = this.game;
    const floaties = [
      ['🎈', '8%', '18%', '0s'],
      ['⭐', '84%', '14%', '1s'],
      ['🎪', '12%', '72%', '2s'],
      ['🤸', '82%', '70%', '0.5s'],
      ['🍭', '50%', '8%', '1.5s'],
      ['🪙', '70%', '86%', '2.5s'],
      ['🧸', '28%', '88%', '3s'],
    ].map(([e, x, y, d]) => h('div', { class: 'floaty', style: `left:${x};top:${y};animation-delay:${d}` }, e));

    return h(
      'div',
      { class: 'screen title-screen scrollable' },
      ...floaties,
      h(
        'div',
        { class: 'row center', style: 'gap:2vw' },
        h('div', { class: 'title-mascot', style: 'animation: bob 2.6s ease-in-out infinite' }, portraitImg(g.mascotPortrait('jhow'), 'jhow')),
        h(
          'div',
          { class: 'logo' },
          h('div', { class: 'logo-main' }, 'DIVERTILAND'),
          h('div', { class: 'logo-sub' }, 'O Mundo da Diversão'),
        ),
        h('div', { class: 'title-mascot', style: 'animation: bob 2.6s ease-in-out infinite .6s' }, portraitImg(g.mascotPortrait('mina'), 'mina')),
      ),
      h('div', { style: 'height:18px' }),
      btn(g, 'JOGAR', {
        icon: '▶',
        cls: 'big green',
        onClick: () => {
          g.audio.unlock();
          g.afterTitle();
        },
      }),
      h(
        'div',
        { class: 'row' },
        btn(g, null, { icon: '⚙️', cls: 'round ghost', aria: 'Ajustes', onClick: () => g.openSettings() }),
      ),
      h('div', { class: 'placeholder-tag' }, 'Versão em desenvolvimento • arte e sons provisórios'),
    );
  }
}
