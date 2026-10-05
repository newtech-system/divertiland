import { MAX_PROFILES } from '../../systems/ProfileManager';
import { h } from '../dom';
import { Screen } from '../UIManager';
import { btn, portraitImg } from '../components/widgets';

/** Escolha de perfil (irmãos/colegas podem ter cada um o seu progresso). */
export class ProfileSelectScreen extends Screen {
  build(): HTMLElement {
    const g = this.game;
    const s = g.services;
    const cards = s.profiles.list.map((p) =>
      h(
        'div',
        {
          class: 'profile-card',
          role: 'button',
          onclick: () => {
            g.audio.play('button');
            s.profiles.select(p.id);
            g.goMap({ greet: true });
          },
        },
        portraitImg(g.portraitFor(p), p.character),
        h('div', null, p.name),
        h('div', { class: 'meta' }, h('span', null, `⭐ ${s.progression.totalStars(p)}`), h('span', null, `🪙 ${p.divertis}`)),
      ),
    );
    if (s.profiles.list.length < MAX_PROFILES) {
      cards.push(
        h(
          'div',
          { class: 'profile-card add', role: 'button', onclick: () => (g.audio.play('button'), g.goCreateProfile()) },
          h('div', { style: 'font-size:56px' }, '➕'),
          h('div', null, 'Novo jogador'),
        ),
      );
    }
    return h(
      'div',
      { class: 'screen center', style: 'gap:22px;padding:20px;overflow-y:auto' },
      h('h1', { class: 'title-xl' }, 'Quem vai jogar?'),
      h('div', { class: 'profiles-grid' }, ...cards),
      btn(g, null, { icon: '⬅️', cls: 'round ghost', aria: 'Voltar', sound: 'back', onClick: () => g.goTitle() }),
    );
  }
}
