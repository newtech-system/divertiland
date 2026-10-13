import type { GameManager } from '../../core/GameManager';
import { getAchievement } from '../../data/achievements';
import { ADVENTURES, MAX_GOLDEN_TEDDIES, getAdventure } from '../../data/adventures';
import { getItem } from '../../data/items';
import { REWARD_MODE, redemptionEnabled } from '../../data/rewards';
import { otherCharacter } from '../../engine/character/looks';
import type { AdventureOutcome, RunApplied } from '../../systems/AdventureService';
import type { LevelRunResult } from '../../systems/LevelResult';
import { h, wait } from '../dom';
import { Screen } from '../UIManager';
import { btn, speech } from '../components/widgets';
import { formatTime } from './MapScreen';

/**
 * ETAPA CONCLUÍDA (seção 8): a aventura tem várias jogadas. Entre uma e outra a criança
 * vê o que mudou no mundo e qual é a próxima etapa — nunca uma tela de "fim" no meio.
 */
export class StageDoneScreen extends Screen {
  constructor(
    game: GameManager,
    private adventureId: string,
    private applied: Extract<RunApplied, { kind: 'nextRun' }>,
    private result: LevelRunResult,
  ) {
    super(game);
  }

  build(): HTMLElement {
    const g = this.game;
    const adv = getAdventure(this.adventureId)!;
    const a = this.applied;
    const guide = otherCharacter(g.profile!.character);
    const done = h('div', { class: 'objectives' });
    for (const st of a.stages) {
      done.append(h('div', { class: 'objective done' }, h('span', { class: 'o-ico' }, '✅'), h('div', null, h('b', null, st.name), h('div', { style: 'font-size:14px' }, st.outcome))));
    }
    const panel = h(
      'div',
      { class: 'panel' },
      h('h2', { class: 'title-l' }, 'Etapa concluída!'),
      h('div', { style: 'color:#5b4a86;font-weight:600' }, adv.name),
      done,
      h('div', { style: 'color:#5b4a86;font-weight:600;font-size:17px' }, `🪙 ${this.result.coinsCollected}/${this.result.coinsTotal} nesta etapa   ⏱️ ${formatTime(this.result.timeSec)}`),
      a.divertis > 0 ? h('div', { class: 'reward-line' }, h('span', null, '🪙'), 'Divertis desta etapa', h('span', { class: 'amt' }, `+${a.divertis}`)) : null,
      h('div', { class: 'unlock-banner', style: 'background:linear-gradient(90deg,#39d98a,#9be27a);color:#09341f' }, `➡️ Próxima etapa: ${a.nextStageMission}`),
      h('div', { style: 'display:flex;justify-content:center;margin:10px 0' }, speech(g, guide, 'Você avançou na história! Vamos para a próxima parte?')),
      h(
        'div',
        { class: 'row center wrap', style: 'margin-top:8px' },
        btn(g, 'Mapa', { icon: '🗺️', cls: 'white', onClick: () => g.goMap() }),
        btn(g, 'Continuar a aventura', { icon: '▶', cls: 'big green', onClick: () => g.continueAdventure() }),
      ),
    );
    return h('div', { class: 'screen results scrollable' }, panel);
  }

  onShow() {
    this.game.audio.play('star');
  }
}

/**
 * CONCLUSÃO DA AVENTURA (seções 3.5 e 6 do MARCO 2).
 *
 * As categorias ficam SEPARADAS, porque cada uma significa uma coisa diferente:
 *  1. o que a criança fez nesta partida (moedas, tempo, etapas);
 *  2. bônus da missão (recompensas finitas, pagas uma vez pelo livro-caixa);
 *  3. coleção permanente (ursinhos dourados — não é "bônus", é identidade);
 *  4. Divertis desta partida e o acumulado;
 *  5. Pontos de Troca, com o aviso de SIMULAÇÃO e sem nunca somar aos Divertis.
 */
export class AdventureResultsScreen extends Screen {
  private panel!: HTMLElement;

  constructor(
    game: GameManager,
    private result: LevelRunResult,
    private outcome: AdventureOutcome,
  ) {
    super(game);
  }

  build(): HTMLElement {
    this.panel = h('div', { class: 'panel' });
    return h('div', { class: 'screen results scrollable' }, this.panel);
  }

  onShow() {
    void this.animate();
  }

  private async animate() {
    const g = this.game;
    const o = this.outcome;
    const r = this.result;
    const adv = getAdventure(o.adventureId)!;
    const p = this.panel;

    const starsEl = h('div', { class: 'result-stars' }, ...[0, 1, 2].map(() => h('span', null, '⭐')));
    p.append(
      h('h2', { class: 'title-l' }, o.isFirstCompletion ? 'Aventura concluída!' : 'Muito bem!'),
      h('div', { style: 'color:#5b4a86;font-weight:600' }, adv.name),
      starsEl,
    );
    await wait(400);
    for (let i = 0; i < o.stars; i++) {
      starsEl.children[i].classList.add('on');
      g.audio.play('star', { pitch: 1 + i * 0.12 });
      await wait(400);
    }

    // ---------------- 1. o que você fez
    p.append(h('div', { style: 'font-weight:800;margin-top:8px' }, 'O que você fez:'));
    const stages = h('div', { class: 'objectives' });
    for (const st of o.stagesDone) {
      stages.append(h('div', { class: 'objective done' }, h('span', { class: 'o-ico' }, '✅'), h('div', null, h('b', null, st.name), h('div', { style: 'font-size:14px' }, st.outcome))));
    }
    p.append(stages);
    p.append(h('div', { style: 'color:#5b4a86;font-weight:600;font-size:17px' }, `🪙 ${r.coinsCollected}/${r.coinsTotal} nesta partida   ⏱️ ${formatTime(r.timeSec)}`));

    // ---------------- 2. estrelas (o que deu cada estrela)
    const objs = h('div', { class: 'objectives', style: 'margin:6px 0' });
    objs.append(h('div', { class: 'objective done' }, h('span', { class: 'o-ico' }, '🏁'), 'Terminar a aventura', h('span', { class: 'o-star' }, '⭐')));
    for (const ob of adv.bonusObjectives) {
      const met = o.objectivesMet.includes(ob.id);
      objs.append(h('div', { class: `objective ${met ? 'done' : ''}` }, h('span', { class: 'o-ico' }, ob.icon), ob.label, h('span', { class: `o-star ${met ? '' : 'off'}` }, '⭐')));
    }
    p.append(objs);

    // ---------------- 3. coleção permanente (não entra como "bônus")
    p.append(h('div', { style: 'font-weight:800;margin-top:8px' }, 'Sua coleção:'));
    const col = h(
      'div',
      { class: 'objective', style: 'background:#fff4c2' },
      h('span', { class: 'o-ico' }, '🧸'),
      `Ursinhos dourados: ${o.goldensTotal.found} de ${MAX_GOLDEN_TEDDIES}`,
    );
    p.append(col);
    if (o.newGoldens.length) {
      for (const gid of o.newGoldens) {
        const teddy = adv.goldens.find((x) => x.id === gid);
        p.append(h('div', { class: 'unlock-banner item' }, `🧸 Ursinho dourado novo! ${teddy ? teddy.hint : ''}`));
      }
      g.audio.play('collectible');
    }

    // ---------------- 4. Divertis: moedas, bônus da missão e total
    const coinLines = o.rewardLines.filter((l) => l.label === 'Divertis coletados');
    const teddyLines = o.rewardLines.filter((l) => l.icon === '🧸');
    const bonusLines = o.rewardLines.filter((l) => !coinLines.includes(l) && !teddyLines.includes(l));
    p.append(h('div', { style: 'font-weight:800;margin-top:8px' }, 'Divertis (moeda de brincar):'));
    const lines = h('div', { class: 'reward-lines' });
    for (const l of coinLines) lines.append(h('div', { class: 'reward-line' }, h('span', null, l.icon), l.label, h('span', { class: 'amt' }, `+${l.amount}`)));
    if (bonusLines.length) lines.append(h('div', { style: 'font-weight:700;color:#5b4a86;margin-top:4px' }, 'Bônus da missão:'));
    bonusLines.forEach((l, i) =>
      lines.append(h('div', { class: 'reward-line', style: `animation-delay:${i * 0.1}s` }, h('span', null, l.icon), l.label, h('span', { class: 'amt' }, `+${l.amount}`))),
    );
    if (teddyLines.length) {
      const sum = teddyLines.reduce((s, l) => s + l.amount, 0);
      lines.append(h('div', { class: 'reward-line' }, h('span', null, '🧸'), 'Prêmio da coleção', h('span', { class: 'amt' }, `+${sum}`)));
    }
    p.append(lines);
    const total = h('div', { class: 'total-divertis' }, '🪙 +0');
    p.append(total);
    const steps = 22;
    for (let i = 1; i <= steps; i++) {
      total.textContent = `🪙 +${Math.round((o.totalDivertis * i) / steps)}`;
      if (i % 3 === 0) g.audio.play('coin', { pitch: 1 + i / steps / 2, volume: 0.5 });
      await wait(40);
    }
    p.append(h('div', { style: 'text-align:center;color:#5b4a86;font-weight:700' }, `Você tem agora 🪙 ${g.profile!.divertis} Divertis`));

    // ---------------- 5. Pontos de Troca: saldo separado, em simulação
    p.append(h('div', { style: 'font-weight:800;margin-top:10px' }, 'Pontos de Troca (brindes no parque):'));
    p.append(
      h(
        'div',
        { class: 'objective', style: 'background:#eaf4ff' },
        h('span', { class: 'o-ico' }, '🎟️'),
        h(
          'div',
          null,
          h('b', null, o.tokensEarned > 0 ? `+${o.tokensEarned} Pontos de Troca` : 'Nenhum ponto novo nesta partida'),
          h('div', { style: 'font-size:14px' }, `Saldo: ${g.profile!.tokens} pontos. Os Pontos de Troca NÃO são Divertis.`),
        ),
      ),
    );
    if (REWARD_MODE === 'simulacao' || !redemptionEnabled()) {
      p.append(
        h(
          'div',
          { class: 'unlock-banner', style: 'background:linear-gradient(90deg,#ffd60a,#ff8a00);color:#2a1457' },
          '🧪 SIMULAÇÃO: a troca por brinde de verdade ainda está desligada. A tabela de pontos será definida pela Divertiland.',
        ),
      );
    }

    // ---------------- itens, desbloqueios, conquistas
    for (const id of o.itemsGranted) {
      const it = getItem(id);
      const piece = ADVENTURES.find((a) => a.worldPiece.id === id)?.worldPiece;
      if (it) p.append(h('div', { class: 'unlock-banner item' }, `${it.icon} Novo item: ${it.name}!`));
      else if (piece) p.append(h('div', { class: 'unlock-banner item' }, `${piece.icon} Peça nova no Meu Mundo: ${piece.name}!`));
    }
    for (const id of o.unlocked) {
      const a = getAdventure(id);
      if (a) {
        p.append(h('div', { class: 'unlock-banner' }, `🔓 Nova aventura: ${a.icon} ${a.name}`));
        g.audio.play('unlock');
      }
    }
    for (const id of o.achievements) {
      const a = getAchievement(id);
      if (a) p.append(h('div', { class: 'unlock-banner ach' }, `🏆 Conquista: ${a.icon} ${a.name} (+${a.reward} 🪙)`));
    }
    if (o.chestsReady.length) p.append(h('div', { class: 'unlock-banner', style: 'background:linear-gradient(90deg,#ffd60a,#ff8a00);color:#2a1457' }, '🎁 Tem um baú pronto no mapa!'));

    // ---------------- o aprendizado vivido (seção 15), dito pelo guia
    const guide = otherCharacter(g.profile!.character);
    p.append(h('div', { style: 'display:flex;justify-content:center;margin:10px 0' }, speech(g, guide, o.learningLine)));

    p.append(
      h(
        'div',
        { class: 'row center wrap', style: 'margin-top:8px' },
        btn(g, 'Jogar de novo', { icon: '🔁', cls: 'white', onClick: () => g.startAdventure(o.adventureId, r.difficulty, false) }),
        btn(g, 'Mapa', { icon: '🗺️', cls: 'big green', onClick: () => g.goMap({ unlocked: o.unlocked, justCompleted: o.adventureId }) }),
      ),
    );
    p.scrollTop = 0;
  }
}
