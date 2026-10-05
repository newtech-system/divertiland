import type { GameManager } from '../../core/GameManager';
import type { CharacterId, DifficultyId } from '../../core/types';
import { CHARACTERS } from '../../data/characters';
import { DIFFICULTIES } from '../../data/difficulty';
import type { SfxId } from '../../audio/AudioManager';
import { h } from '../dom';

/** Botão padrão: som de clique + vibração curta no celular. */
export function btn(
  game: GameManager,
  label: string | null,
  opts: { icon?: string; cls?: string; sound?: SfxId | null; onClick: () => void; aria?: string; disabled?: boolean },
): HTMLButtonElement {
  const b = h(
    'button',
    { class: `btn ${opts.cls ?? ''}`, 'aria-label': opts.aria ?? label ?? opts.icon ?? '' },
    opts.icon ? h('span', { class: 'ico' }, opts.icon) : null,
    label,
  );
  if (opts.disabled) b.classList.add('disabled');
  b.addEventListener('click', () => {
    if (opts.sound !== null) game.audio.play(opts.sound ?? 'button');
    try {
      navigator.vibrate?.(8);
    } catch {
      /* ok */
    }
    opts.onClick();
  });
  return b;
}

export function portraitImg(src: string, fallbackCharacter: CharacterId = 'jhow', size?: number): HTMLElement {
  if (!src) return h('span', { class: 'portrait', style: size ? `width:${size}px;height:${size}px` : '' }, fallbackCharacter === 'mina' ? '🐻‍❄️' : '🐻');
  return h('img', { class: 'portrait', src, alt: CHARACTERS[fallbackCharacter].name, draggable: false, style: size ? `width:${size}px;height:${size}px` : '' });
}

/** Balão de fala do mascote. Lê em voz alta; tocar repete a fala. */
export function speech(game: GameManager, speaker: CharacterId, text: string, icon?: string): HTMLElement {
  const el = h(
    'div',
    { class: 'speech', role: 'status' },
    portraitImg(game.mascotPortrait(speaker), speaker),
    h(
      'div',
      { class: 'bubble' },
      h('span', { class: 'who' }, CHARACTERS[speaker].name),
      icon ? h('span', { class: 'big-icon' }, icon) : null,
      text,
      game.narrator.available && game.settings.narration ? h('span', { class: 'replay' }, '🔊') : null,
    ),
  );
  el.addEventListener('click', () => game.speak(text, speaker));
  game.speak(text, speaker);
  return el;
}

export function difficultyPicker(
  game: GameManager,
  selected: DifficultyId,
  onPick: (d: DifficultyId) => void,
  compact = false,
): HTMLElement {
  const wrap = h('div', { class: 'diff-choice' });
  const render = (sel: DifficultyId) => {
    wrap.replaceChildren(
      ...(Object.values(DIFFICULTIES).map((d) =>
        h(
          'button',
          {
            class: `diff-btn ${compact ? 'compact' : ''} ${d.id === sel ? 'selected' : ''}`,
            style: `--diff-color:${d.color}`,
            'aria-pressed': String(d.id === sel),
            onclick: () => {
              game.audio.play('pop');
              game.speak(d.name);
              render(d.id);
              onPick(d.id);
            },
          },
          h('span', { class: 'emoji' }, d.icon),
          h('span', { class: 'name' }, d.name),
          compact ? null : h('span', { class: 'desc' }, d.description),
        ),
      ) as HTMLElement[]),
    );
  };
  render(selected);
  return wrap;
}

export const LEVEL_TYPE_LABEL: Record<string, string> = {
  exploration3D: '🏰 Exploração 3D',
  runner: '🏃 Corrida',
  parkour: '🧗 Parkour',
  hiddenObjects: '🔎 Objetos escondidos',
  puzzle: '🧩 Quebra-cabeça',
  platformer2D: '🎮 Aventura de lado',
  floorIsLava: '🌋 O chão é lava',
  narrative: '📖 Aventura com história',
  tasks: '🛠️ Missões',
  trampoline: '🤸 Trampolim',
  hideAndSeek: '🙈 Esconde-esconde',
  bonusMix: '🏆 Fase bônus',
};
