import type { GameManager } from '../../core/GameManager';
import { getAchievement } from '../../data/achievements';
import { CHARACTERS } from '../../data/characters';
import { getItem } from '../../data/items';
import { getLevel } from '../../data/worlds';
import { otherCharacter } from '../../engine/character/looks';
import type { LevelOutcome, LevelRunResult } from '../../systems/LevelResult';
import { h, wait } from '../dom';
import { Screen } from '../UIManager';
import { btn, speech } from '../components/widgets';
import { formatTime } from './MapScreen';

/**
 * Tela de conclusão (seção 27): estrelas aparecendo uma a uma, Divertis contando,
 * desbloqueios e conquistas. Só mensagens positivas.
 */
export class ResultsScreen extends Screen {
  private panel!: HTMLElement;

  constructor(
    game: GameManager,
    private result: LevelRunResult,
    private outcome: LevelOutcome,
  ) {
    super(game);
  }

  build(): HTMLElement {
    this.panel = h('div', { class: 'panel' });
    return h('div', { class: 'screen results' }, this.panel);
  }

  onShow() {
    void this.animate();
  }

  private async animate() {
    const g = this.game;
    const o = this.outcome;
    const r = this.result;
    const level = getLevel(o.levelId)!;
    const p = this.panel;
    const starsEl = h('div', { class: 'result-stars' }, ...[0, 1, 2].map(() => h('span', null, '⭐')));
    p.append(h('h2', { class: 'title-l' }, o.isFirstCompletion ? 'Fase concluída!' : 'Muito bem!'), h('div', { style: 'color:#5b4a86;font-weight:600' }, level.name), starsEl);

    await wait(450);
    for (let i = 0; i < o.stars; i++) {
      starsEl.children[i].classList.add('on');
      g.audio.play('star', { pitch: 1 + i * 0.12 });
      await wait(420);
    }
    // Objetivos (o que deu estrela)
    const objs = h('div', { class: 'objectives', style: 'margin:6px 0' });
    for (const ob of level.objectives) {
      const met = o.objectivesMet.includes(ob.id);
      objs.append(
        h('div', { class: `objective ${met ? 'done' : ''}` }, h('span', { class: 'o-ico' }, ob.icon), ob.label, h('span', { class: `o-star ${met ? '' : 'off'}` }, '⭐')),
      );
    }
    p.append(objs);
    p.append(
      h('div', { style: 'color:#5b4a86;font-weight:600;font-size:17px' }, `🪙 ${r.coinsCollected}/${r.coinsTotal}   ⏱️ ${formatTime(r.timeSec)}${o.newBestTime ? '  🏅 Recorde!' : ''}`),
    );

    // Divertis
    const lines = h('div', { class: 'reward-lines' });
    p.append(lines);
    o.rewardLines.forEach((l, i) => {
      lines.append(
        h('div', { class: 'reward-line', style: `animation-delay:${i * 0.12}s` }, h('span', null, l.icon), l.label, h('span', { class: 'amt' }, `+${l.amount}`)),
      );
    });
    const total = h('div', { class: 'total-divertis' }, '🪙 +0');
    p.append(total);
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      total.textContent = `🪙 +${Math.round((o.totalDivertis * i) / steps)}`;
      if (i % 3 === 0) g.audio.play('coin', { pitch: 1 + i / steps / 2, volume: 0.5 });
      await wait(40);
    }

    for (const id of o.itemsGranted) {
      const it = getItem(id);
      if (it) p.append(h('div', { class: 'unlock-banner item' }, `${it.icon} Novo item: ${it.name}!`));
    }
    for (const id of o.unlockedLevels) {
      const l = getLevel(id);
      if (l) {
        p.append(h('div', { class: 'unlock-banner' }, `🔓 ${l.map.style === 'secret' ? 'FASE SECRETA' : 'Nova fase'}: ${l.icon} ${l.name}`));
        g.audio.play('unlock');
      }
    }
    for (const id of o.achievements) {
      const a = getAchievement(id);
      if (a) p.append(h('div', { class: 'unlock-banner ach' }, `🏆 Conquista: ${a.icon} ${a.name} (+${a.reward} 🪙)`));
    }
    if (o.chestsReady.length) p.append(h('div', { class: 'unlock-banner', style: 'background:linear-gradient(90deg,#ffd60a,#ff8a00);color:#2a1457' }, '🎁 Tem um baú pronto no mapa!'));

    const guide = otherCharacter(g.profile!.character);
    const line =
      o.stars === 3
        ? 'Três estrelas! Você é incrível!'
        : o.stars === 2
          ? 'Muito bem! Quer tentar pegar a última estrela?'
          : `${CHARACTERS[guide].lines.cheer[0]} Dá para voltar e descobrir mais segredos!`;
    p.append(h('div', { style: 'display:flex;justify-content:center;margin:10px 0' }, speech(g, guide, line)));

    p.append(
      h(
        'div',
        { class: 'row center wrap', style: 'margin-top:8px' },
        btn(g, 'Jogar de novo', { icon: '🔁', cls: 'white', onClick: () => g.replayLevel() }),
        btn(g, 'Mapa', { icon: '🗺️', cls: 'big green', onClick: () => g.goMap({ unlocked: o.unlockedLevels, justCompleted: o.levelId }) }),
      ),
    );
    p.scrollTop = 0;
  }
}
