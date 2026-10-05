import type { CharacterId, DifficultyId } from '../../core/types';
import { CHARACTERS } from '../../data/characters';
import { defaultLook } from '../../engine/character/looks';
import { MAX_NAME_LENGTH } from '../../systems/ProfileManager';
import { h } from '../dom';
import { Screen } from '../UIManager';
import { btn, difficultyPicker, portraitImg } from '../components/widgets';

const NAME_IDEAS = ['Explorador', 'Aventureira', 'Estrelinha', 'Super Pulo', 'Raio Veloz', 'Pipoca', 'Foguete', 'Arco-Íris'];

/**
 * Criação de perfil (seção 5) em 3 passos curtos e visuais:
 * 1) escolher personagem  2) apelido (com sugestões para quem não escreve)  3) estilo de aventura.
 */
export class ProfileCreateScreen extends Screen {
  private step = 0;
  private character: CharacterId = 'jhow';
  private name = '';
  private difficulty: DifficultyId = 'monkey';
  private stageEl!: HTMLElement;
  private body!: HTMLElement;
  private dots!: HTMLElement;

  build(): HTMLElement {
    this.stageEl = h('div', { class: 'stage' }, h('div', { class: 'stage-floor' }));
    this.body = h('div', { class: 'col center', style: 'width:100%' });
    this.dots = h('div', { class: 'step-dots' });
    const el = h('div', { class: 'screen create-screen scrollable' }, this.dots, this.stageEl, this.body);
    this.render();
    return el;
  }

  stage() {
    return this.stageEl;
  }

  onShow() {
    this.updatePreview();
  }

  private updatePreview() {
    this.game.showroom.setCharacter(this.character, defaultLook(this.character));
  }

  private render() {
    const g = this.game;
    this.dots.replaceChildren(...[0, 1, 2].map((i) => h('span', { class: i <= this.step ? 'on' : '' })));
    const back = btn(g, null, {
      icon: '⬅️',
      cls: 'round white',
      aria: 'Voltar',
      sound: 'back',
      onClick: () => {
        if (this.step === 0) {
          if (g.services.profiles.list.length) g.goProfiles();
          else g.goTitle();
        } else {
          this.step--;
          this.render();
        }
      },
    });

    if (this.step === 0) {
      g.speak('Escolha seu personagem!');
      const choice = h(
        'div',
        { class: 'char-choice' },
        ...(['jhow', 'mina'] as CharacterId[]).map((c) =>
          h(
            'button',
            {
              class: `char-btn ${c === this.character ? 'selected' : ''}`,
              onclick: () => {
                g.audio.play('pop');
                this.character = c;
                this.updatePreview();
                g.showroom.play('wave');
                g.speak(`${CHARACTERS[c].name}! ${CHARACTERS[c].tagline}`, c);
                this.render();
              },
            },
            portraitImg(g.mascotPortrait(c), c),
            CHARACTERS[c].name,
            h('small', null, CHARACTERS[c].tagline),
          ),
        ),
      );
      this.body.replaceChildren(
        h('h2', { class: 'title-l', style: 'color:#fff' }, 'Escolha seu personagem!'),
        choice,
        h('div', { class: 'row center' }, back, btn(g, 'Pronto!', { icon: '✔', cls: 'big green', onClick: () => this.next() })),
      );
    } else if (this.step === 1) {
      g.speak('Qual é o seu apelido?');
      const input = h('input', {
        class: 'name-input',
        maxLength: MAX_NAME_LENGTH,
        placeholder: 'Seu apelido',
        value: this.name,
        autocomplete: 'off',
        spellcheck: false,
        enterkeyhint: 'done',
      }) as HTMLInputElement;
      input.addEventListener('input', () => (this.name = input.value));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.next();
      });
      const ideas = h(
        'div',
        { class: 'name-suggestions' },
        ...NAME_IDEAS.map((n) =>
          btn(g, n, {
            cls: 'small white',
            sound: 'pop',
            onClick: () => {
              this.name = n;
              input.value = n;
            },
          }),
        ),
      );
      this.body.replaceChildren(
        h('h2', { class: 'title-l', style: 'color:#fff' }, 'Qual é o seu apelido?'),
        input,
        ideas,
        h('div', { class: 'row center' }, back, btn(g, 'Pronto!', { icon: '✔', cls: 'big green', onClick: () => this.next() })),
      );
      setTimeout(() => {
        // Em celular, não abrir o teclado automaticamente (crianças podem usar as sugestões).
        if (!('ontouchstart' in window)) input.focus();
      }, 50);
    } else {
      g.speak('Como você quer brincar?');
      this.body.replaceChildren(
        h('h2', { class: 'title-l', style: 'color:#fff' }, 'Como você quer brincar?'),
        h('div', { class: 'subtitle' }, 'Dá para trocar antes de cada fase!'),
        difficultyPicker(g, this.difficulty, (d) => (this.difficulty = d)),
        h('div', { class: 'row center' }, back, btn(g, 'Vamos!', { icon: '🚀', cls: 'big orange', onClick: () => this.next() })),
      );
    }
  }

  private next() {
    if (this.step < 2) {
      this.step++;
      this.render();
      return;
    }
    const g = this.game;
    g.services.profiles.create(this.name, this.character, this.difficulty);
    void g.services.save.flush();
    g.audio.play('unlock');
    g.goMap({ greet: true, firstTime: true });
  }
}
