import type { GameManager } from '../../core/GameManager';
import type { DifficultyId } from '../../core/types';
import { CHARACTERS } from '../../data/characters';
import { ADVENTURES, MAX_CAMPAIGN_STARS, MAX_GOLDEN_TEDDIES, type AdventureDef } from '../../data/adventures';
import { getItem } from '../../data/items';
import { REWARD_MODE } from '../../data/rewards';
import type { ChestDef } from '../../data/levelTypes';
import { WORLDS, getLevel } from '../../data/worlds';
import { otherCharacter } from '../../engine/character/looks';
import { h, stars, wait } from '../dom';
import { Screen } from '../UIManager';
import { btn, difficultyPicker, portraitImg, speech } from '../components/widgets';
import { atracaoSvg, fundoDoParque, propsDoParque } from '../components/mapaParque';
import { openAchievements } from './AchievementsModal';

export interface MapEnterOptions {
  greet?: boolean;
  firstTime?: boolean;
  /** Aventuras recém-liberadas (ganham destaque). */
  unlocked?: string[];
  justCompleted?: string;
}

const STEP = 168;
/** Lugar de cada baú no mapa das aventuras (o mapa antigo tinha dez fases). */
const CHEST_POS: Record<string, { x: number; y: number }> = {
  w1_chest_1: { x: 58, y: 1.0 },
  w1_chest_2: { x: 46, y: 2.4 },
  w1_chest_3: { x: 24, y: 4.4 },
};
const PAD_BOTTOM = 210;
const PAD_TOP = 250;

/**
 * MAPA DAS CINCO AVENTURAS (seções 7 e 8 do prompt mestre V2).
 *
 * Mostra as CINCO aventuras, o que já foi conquistado em cada uma, a próxima etapa em
 * linguagem de criança, a entrada separada do MEU MUNDO e dois desafios bônus.
 * Honestidade: uma aventura montada com conteúdo provisório diz isso na cara ("versão
 * provisória"), e nada aparece como pronto sem estar pronto.
 */
export class AdventureMapScreen extends Screen {
  private scroll!: HTMLElement;
  private bottom!: HTMLElement;
  private world = WORLDS[0];

  constructor(
    game: GameManager,
    private opts: MapEnterOptions,
  ) {
    super(game);
  }

  build(): HTMLElement {
    const g = this.game;
    const s = g.services;
    const p = g.profile!;
    const maxY = Math.max(...ADVENTURES.map((a) => a.map.y), 4);
    const height = PAD_BOTTOM + maxY * STEP + PAD_TOP;
    const posOf = (x: number, y: number) => ({ left: x, bottom: PAD_BOTTOM + y * STEP });

    const worldEl = h('div', { class: 'map-world', style: `height:${height}px` });
    // O chão do parque (piso claro, tapetes dos setores e respingos) entra no lugar do
    // degradê com emoji espalhado que o documento manda evitar.
    worldEl.append(fundoDoParque(height));
    for (const p of propsDoParque(height)) {
      worldEl.append(h('div', { class: 'map-prop-wrap', style: `left:${p.x}%;bottom:${p.y}px` }, p.el));
    }

    // ---------------- caminho entre as aventuras
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map-path');
    svg.setAttribute('viewBox', `0 0 100 ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const pt = (a: AdventureDef) => [a.map.x, height - (PAD_BOTTOM + a.map.y * STEP)] as const;
    let prev: readonly [number, number] = [50, height - 40];
    ADVENTURES.forEach((a, i) => {
      const [x, y] = pt(a);
      const midY = (prev[1] + y) / 2;
      const done = i === 0 || s.adventures.progress(ADVENTURES[i - 1].id).completed;
      const d = `M ${prev[0]} ${prev[1]} C ${prev[0]} ${midY}, ${x} ${midY}, ${x} ${y}`;
      const mk = (stroke: string, width: number, dash?: string) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', stroke);
        path.setAttribute('stroke-width', String(width));
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        if (dash) path.setAttribute('stroke-dasharray', dash);
        svg.appendChild(path);
      };
      mk('rgba(60,10,140,0.35)', 26);
      mk(done ? '#ffd60a' : 'rgba(255,255,255,0.85)', 16, done ? undefined : '2 22');
      prev = [x, y];
    });
    worldEl.append(svg);
    worldEl.append(h('div', { class: 'world-banner', style: 'bottom:20px' }, '🚩 INÍCIO'));

    // ---------------- as cinco aventuras
    const currentId = s.adventures.currentAdventureId();
    for (const adv of ADVENTURES) {
      const state = s.adventures.state(adv.id);
      const ap = s.adventures.progress(adv.id);
      const pos = posOf(adv.map.x, adv.map.y);
      const isNew = this.opts.unlocked?.includes(adv.id);
      const node = h(
        'div',
        {
          class: `map-node ${state.toLowerCase()} ${adv.map.style}`,
          style: `left:${pos.left}%;bottom:${pos.bottom}px`,
          role: 'button',
          'aria-label': `Aventura ${adv.order}: ${adv.name}`,
          onclick: () => this.openAdventure(adv),
        },
        h(
          'div',
          { class: 'bubble' },
          atracaoSvg(adv.map.cena),
          state === 'LOCKED' ? h('span', { class: 'lock' }, '🔒') : null,
          h('span', { class: 'num' }, adv.order),
          state === 'IN_PROGRESS' ? h('span', { class: 'inprog' }, '⏯️') : null,
        ),
        stars(s.adventures.stars(adv.id)),
        // Só a aventura da vez mostra nome e andamento. O documento pede título curto e
        // progresso AO SELECIONAR, sem jogar todos os detalhes sobre o mapa — antes
        // cada nó carregava o nome inteiro e mais duas linhas.
        adv.id === currentId ? h('div', { class: 'label' }, adv.map.curto) : null,
        adv.id === currentId
          ? h(
              'div',
              { class: 'label', style: 'font-size:13px;opacity:.9' },
              `🧸 ${ap.goldens.length}/3${adv.finalContent ? '' : ' · versão provisória'}`,
            )
          : null,
      );
      if (isNew) node.style.animation = 'popIn 0.8s cubic-bezier(0.2,1.6,0.4,1) 0.6s backwards';
      worldEl.append(node);
      if (adv.id === currentId) {
        worldEl.append(
          h('div', { class: 'map-avatar', style: `left:${pos.left}%;bottom:${pos.bottom + 78}px` }, portraitImg(g.portraitFor(), p.character)),
        );
      }
    }

    // ---------------- entrada do MEU MUNDO (separada e sinalizada)
    const pieces = this.worldPieces();
    worldEl.append(
      h(
        'div',
        {
          class: 'map-node available special',
          style: `left:80%;bottom:${PAD_BOTTOM + 0.3 * STEP}px`,
          role: 'button',
          'aria-label': 'Meu Mundo Divertiland',
          onclick: () => this.openMeuMundo(),
        },
        h('div', { class: 'bubble' }, h('span', { class: 'icon' }, '🏡')),
        h('div', { class: 'label' }, 'Meu Mundo'),
        h('div', { class: 'label', style: 'font-size:13px;opacity:.9' }, `🧩 ${pieces.length}/${ADVENTURES.length} peças`),
      ),
    );

    // ---------------- desafios bônus (fases antigas que continuam valendo)
    for (const b of this.bonusNodes()) {
      const lvl = getLevel(b.levelId);
      if (!lvl) continue;
      const done = s.progression.progress(b.levelId).completed;
      worldEl.append(
        h(
          'div',
          {
            class: `map-node ${b.open ? (done ? 'completed' : 'available') : 'locked'} bonus`,
            style: `left:${b.x}%;bottom:${PAD_BOTTOM + b.y * STEP}px`,
            role: 'button',
            'aria-label': `Desafio bônus: ${lvl.name}`,
            onclick: () => this.openBonus(b),
          },
          h('div', { class: 'bubble' }, h('span', { class: 'icon' }, lvl.icon), b.open ? null : h('span', { class: 'lock' }, '🔒')),
          h('div', { class: 'label' }, lvl.name),
          h('div', { class: 'label', style: 'font-size:13px;opacity:.9' }, b.open ? '🏅 desafio bônus' : b.need),
        ),
      );
    }

    // ---------------- baús (agora contam as estrelas das aventuras)
    for (const c of this.world.chests) {
      const st = s.progression.chestState(c, this.world.id);
      worldEl.append(
        h(
          'div',
          {
            class: `map-chest ${st}`,
            style: `left:${CHEST_POS[c.id]?.x ?? c.map.x}%;bottom:${PAD_BOTTOM + (CHEST_POS[c.id]?.y ?? 1) * STEP}px`,
            role: 'button',
            onclick: () => this.chestClick(c),
          },
          h('div', { class: 'box' }, st === 'opened' ? '📭' : '🎁'),
          h('div', { class: 'req' }, st === 'opened' ? '✔' : `⭐ ${c.stars}`),
        ),
      );
    }

    worldEl.append(h('div', { class: 'world-banner next', style: 'top:40px' }, '🔒 Mais aventuras: em breve!'));

    this.scroll = h('div', { class: 'map-scroll' }, worldEl);

    const top = h(
      'div',
      { class: 'map-top' },
      h('div', { class: 'who', role: 'button', onclick: () => (g.audio.play('button'), g.goProfiles()) }, portraitImg(g.portraitFor(), p.character), p.name),
      h('div', { class: 'pill', title: 'Divertis: a moeda de brincar' }, h('span', { class: 'ico' }, '🪙'), String(p.divertis)),
      // Seção 5.2: carteira e coleção saem de cima do mapa e passam a viver num painel
      // secundário. Antes eram quatro contadores empilhados sobre as aventuras — no
      // celular da proprietária eles cobriam os nós do mapa.
      h(
        'div',
        { class: 'pill', role: 'button', 'aria-label': 'Abrir carteira e coleção', onclick: () => this.openCarteira() },
        h('span', { class: 'ico' }, '🎒'),
        'Carteira',
      ),
      h('div', { class: 'grow' }),
      btn(g, null, { icon: '⚙️', cls: 'round white', aria: 'Ajustes', onClick: () => g.openSettings() }),
    );

    this.bottom = h(
      'div',
      { class: 'map-bottom' },
      h('div', { class: 'map-speech' }),
      h(
        'div',
        { class: 'col', style: 'align-items:flex-end' },
        btn(g, null, { icon: '🏆', cls: 'round yellow', aria: 'Conquistas', onClick: () => openAchievements(g) }),
        btn(g, 'Loja', { icon: '🛍️', cls: 'pink', onClick: () => g.openShop() }),
      ),
    );

    return h('div', { class: 'screen map-screen' }, this.scroll, top, this.bottom);
  }

  /** Carteira e coleção: o painel secundário do mapa (seção 5.2). */
  private openCarteira() {
    const g = this.game;
    const s = g.services;
    const p = g.profile!;
    const linha = (ico: string, titulo: string, valor: string, nota?: string) =>
      h(
        'div',
        { class: 'objective' },
        h('span', { class: 'o-ico' }, ico),
        h('div', null, h('div', { style: 'font-weight:800' }, titulo), nota ? h('div', { style: 'font-size:13px;opacity:.85' }, nota) : null),
        h('div', { class: 'grow' }),
        h('div', { style: 'font-weight:800' }, valor),
      );
    const pieces = this.worldPieces();
    const card = h(
      'div',
      { class: 'panel level-card' },
      h('h2', { class: 'title-l' }, '🎒 Sua carteira'),
      h(
        'div',
        { class: 'objectives' },
        linha('🪙', 'Divertis', String(p.divertis), 'Para roupas, enfeites e o Meu Mundo.'),
        linha('⭐', 'Estrelas', `${s.adventures.totalStars()}/${MAX_CAMPAIGN_STARS}`),
        linha('🧸', 'Ursinhos dourados', `${s.adventures.goldenCount().found}/${MAX_GOLDEN_TEDDIES}`),
      ),
      h('h2', { class: 'title-l', style: 'margin-top:10px' }, '🎟️ Pontos de Troca'),
      h('div', { class: 'objectives' }, h('div', { class: 'objective' }, this.tokenPill())),
      REWARD_MODE === 'simulacao'
        ? h(
            'div',
            { class: 'unlock-banner', style: 'background:linear-gradient(90deg,#ffd60a,#ff8a00);color:#2a1457' },
            'Os Pontos de Troca estão em SIMULAÇÃO: ainda não valem prêmio de verdade no parque.',
          )
        : null,
      h('h2', { class: 'title-l', style: 'margin-top:10px' }, `🧩 Coleção do Meu Mundo (${pieces.length}/${ADVENTURES.length})`),
      pieces.length
        ? h('div', { class: 'objectives' }, ...pieces.map((w) => h('div', { class: 'objective done' }, h('span', { class: 'o-ico' }, w.icon), w.name)))
        : h('div', { style: 'color:#5b4a86;font-weight:600' }, 'Cada aventura concluída traz uma peça nova para o seu mundo.'),
    );
    g.audio.play('button');
    g.ui.modal(card);
  }

  /** Pontos de Troca: saldo SEPARADO e com o aviso de simulação sempre visível (18.6). */
  private tokenPill(): HTMLElement {
    const p = this.game.profile!;
    return h(
      'div',
      { class: 'pill', title: 'Pontos de Troca — em simulação, sem resgate de prêmio real' },
      h('span', { class: 'ico' }, '🎟️'),
      String(p.tokens),
      REWARD_MODE === 'simulacao'
        ? h('span', { style: 'font-size:11px;font-weight:800;background:#ffd60a;color:#5a3b00;border-radius:8px;padding:1px 5px;margin-left:4px' }, 'SIMULAÇÃO')
        : null,
    );
  }

  /** Peças do Meu Mundo já conquistadas (uma por aventura concluída). */
  private worldPieces(): { id: string; name: string; icon: string }[] {
    const s = this.game.services;
    return ADVENTURES.filter((a) => s.adventures.progress(a.id).completed).map((a) => a.worldPiece);
  }

  private bonusNodes() {
    const s = this.game.services;
    const a02 = s.adventures.progress('a02').completed;
    const all = ADVENTURES.every((a) => s.adventures.progress(a.id).completed);
    return [
      // x entre 20 e 80: mais para a borda, a plaquinha do nome sai da tela no celular.
      { levelId: 'w1_l06', x: 20, y: 1.9, open: a02, need: 'Termine a Aventura 2' },
      { levelId: 'w1_l10', x: 80, y: 3.2, open: all, need: 'Termine as 5 aventuras' },
    ];
  }

  onShow() {
    const g = this.game;
    const s = g.services;
    const cur = ADVENTURES.find((a) => a.id === s.adventures.currentAdventureId());
    requestAnimationFrame(() => {
      const total = this.scroll.scrollHeight;
      const y = cur ? total - (PAD_BOTTOM + cur.map.y * STEP) : total;
      this.scroll.scrollTop = Math.max(0, y - this.scroll.clientHeight * 0.6);
    });

    const guide = otherCharacter(g.profile!.character);
    let line: string | null = null;
    if (this.opts.firstTime) line = `Oi, ${g.profile!.name}! ${CHARACTERS[guide].lines.welcome[0]}`;
    else if (this.opts.unlocked?.length) line = 'Uma aventura nova acendeu no mapa! Vamos lá?';
    else if (this.opts.greet) line = `Que bom te ver, ${g.profile!.name}! Vamos brincar?`;
    if (s.progression.readyChests().length) line = (line ? line + ' ' : '') + 'Tem um baú pronto para abrir! 🎁';
    if (line) {
      const slot = this.bottom.querySelector('.map-speech') as HTMLElement;
      const sp = speech(g, guide, line);
      slot.append(sp);
      setTimeout(() => sp.remove(), 9000);
    }
    if (this.opts.unlocked?.length) setTimeout(() => g.audio.play('unlock'), 700);
  }

  // ---------------------------------------------------------------- cartão da aventura

  private openAdventure(adv: AdventureDef) {
    const g = this.game;
    const s = g.services;
    const state = s.adventures.state(adv.id);
    if (state === 'LOCKED') {
      g.audio.play('softError');
      const prev = ADVENTURES.find((a) => a.order === adv.order - 1);
      const porque = prev ? `Esta aventura abre quando você terminar ${prev.map.curto}.` : 'Esta aventura ainda não abriu.';
      g.ui.toast('🔒', porque);
      // Seção 5.2: o bloqueio é explicado EM VOZ e em símbolo, para quem não lê.
      g.speak(porque);
      return;
    }
    g.audio.play('button');
    const ap = s.adventures.progress(adv.id);
    const p = g.profile!;
    let diff: DifficultyId = p.preferredDifficulty;
    const runIndex = s.adventures.runIndexToPlay(adv.id);
    const run = adv.runs[runIndex];
    const playable = g.canPlay(run.levelId);
    const inProgress = p.inProgress?.levelId === run.levelId ? p.inProgress : null;

    // Etapas: o que já foi feito e qual é a próxima, em linguagem de criança.
    const stageList = h('div', { class: 'objectives' });
    for (const st of adv.stages) {
      const done = ap.stagesDone.includes(st.id);
      stageList.append(
        h(
          'div',
          { class: `objective ${done ? 'done' : ''}` },
          h('span', { class: 'o-ico' }, done ? '✅' : '•'),
          done ? st.name : st.mission,
        ),
      );
    }

    const starRow = h(
      'div',
      { class: 'objectives', style: 'margin-top:6px' },
      h(
        'div',
        { class: `objective ${ap.completed ? 'done' : ''}` },
        h('span', { class: 'o-ico' }, '🏁'),
        'Terminar a aventura',
        h('span', { class: `o-star ${ap.completed ? '' : 'off'}` }, '⭐'),
      ),
      ...adv.bonusObjectives.map((o) => {
        const done = ap.objectivesMet.includes(o.id);
        return h(
          'div',
          { class: `objective ${done ? 'done' : ''}` },
          h('span', { class: 'o-ico' }, o.icon),
          o.label,
          h('span', { class: `o-star ${done ? '' : 'off'}` }, '⭐'),
        );
      }),
    );

    const goldenRow = h(
      'div',
      { class: 'objective', style: 'background:#fff4c2' },
      h('span', { class: 'o-ico' }, '🧸'),
      `Ursinhos dourados: ${ap.goldens.length} de 3`,
    );

    const actions = h('div', { class: 'col center', style: 'margin-top:8px' });
    if (!playable) {
      actions.append(h('div', { class: 'unlock-banner', style: 'background:linear-gradient(90deg,#ff8a00,#ffd60a);color:#2a1457' }, '🚧 Esta aventura está sendo construída. Volte em breve!'));
    } else {
      actions.append(h('div', { style: 'font-weight:700;font-size:18px' }, 'Escolha seu estilo:'), difficultyPicker(g, diff, (d) => (diff = d), true));
      const row = h('div', { class: 'row center wrap' });
      if (inProgress) {
        row.append(
          btn(g, 'Recomeçar etapa', { icon: '🔁', cls: 'white', onClick: () => (close(), g.startAdventure(adv.id, diff, false)) }),
          btn(g, 'Continuar', { icon: '▶', cls: 'big green', onClick: () => (close(), g.startAdventure(adv.id, inProgress.difficulty, true)) }),
        );
      } else {
        row.append(btn(g, ap.completed ? 'Jogar de novo' : 'COMEÇAR', { icon: '▶', cls: 'big green', onClick: () => (close(), g.startAdventure(adv.id, diff, false)) }));
      }
      actions.append(row);
    }

    const card = h(
      'div',
      { class: 'panel level-card' },
      h(
        'div',
        { class: 'head' },
        h('div', { class: 'big-icon' }, adv.icon),
        h(
          'div',
          null,
          h('span', { class: 'type' }, `Aventura ${adv.order}`),
          h('h2', { class: 'title-l', style: 'text-align:left' }, adv.name),
          h('div', { class: 'tagline' }, adv.tagline),
        ),
      ),
      h('div', { class: 'big-stars', style: 'margin-top:8px' }, ...[0, 1, 2].map((i) => h('span', { class: i < s.adventures.stars(adv.id) ? '' : 'off' }, '⭐'))),
      adv.finalContent
        ? null
        : h(
            'div',
            { class: 'unlock-banner', style: 'background:linear-gradient(90deg,#ffd60a,#ff8a00);color:#2a1457' },
            '🧪 Versão provisória: esta aventura ainda usa etapas do protótipo.',
          ),
      h('div', { style: 'color:#5b4a86;font-weight:600;margin:4px 0' }, adv.premise),
      h('div', { style: 'font-weight:800;margin-top:6px' }, 'Etapas da história:'),
      stageList,
      h('div', { style: 'font-weight:800;margin-top:6px' }, 'Estrelas:'),
      starRow,
      goldenRow,
      actions,
    );
    const close = g.ui.modal(card);
    g.speak(adv.name);
  }

  private openMeuMundo() {
    const g = this.game;
    g.audio.play('button');
    const pieces = this.worldPieces();
    const list = h('div', { class: 'objectives' });
    for (const a of ADVENTURES) {
      const got = pieces.some((x) => x.id === a.worldPiece.id);
      list.append(
        h(
          'div',
          { class: `objective ${got ? 'done' : ''}` },
          h('span', { class: 'o-ico' }, a.worldPiece.icon),
          `${a.worldPiece.name} — ${got ? 'conquistada!' : `vem da aventura ${a.order}`}`,
        ),
      );
    }
    const card = h(
      'div',
      { class: 'panel level-card' },
      h(
        'div',
        { class: 'head' },
        h('div', { class: 'big-icon' }, '🏡'),
        h('div', null, h('span', { class: 'type' }, 'Seu espaço'), h('h2', { class: 'title-l', style: 'text-align:left' }, 'Meu Mundo Divertiland')),
      ),
      h(
        'div',
        { class: 'unlock-banner', style: 'background:linear-gradient(90deg,#39d98a,#9be27a);color:#09341f' },
        '🚧 Primeira versão: dá para explorar o terreno. Construir, decorar e visitar amigos chegam nas próximas atualizações.',
      ),
      h('div', { style: 'font-weight:800;margin-top:6px' }, 'Peças do seu mundo:'),
      list,
      h(
        'div',
        { class: 'row center wrap', style: 'margin-top:8px' },
        btn(this.game, 'ENTRAR', { icon: '▶', cls: 'big green', onClick: () => (close(), this.game.openMeuMundo()) }),
      ),
    );
    const close = g.ui.modal(card);
    g.speak('Meu Mundo Divertiland');
  }

  private openBonus(b: { levelId: string; open: boolean; need: string }) {
    const g = this.game;
    const lvl = getLevel(b.levelId)!;
    if (!b.open) {
      g.audio.play('softError');
      g.ui.toast('🔒', `${b.need} para abrir este desafio!`);
      return;
    }
    g.audio.play('button');
    const p = g.profile!;
    let diff: DifficultyId = p.preferredDifficulty;
    const card = h(
      'div',
      { class: 'panel level-card' },
      h(
        'div',
        { class: 'head' },
        h('div', { class: 'big-icon' }, lvl.icon),
        h('div', null, h('span', { class: 'type' }, '🏅 Desafio bônus'), h('h2', { class: 'title-l', style: 'text-align:left' }, lvl.name), h('div', { class: 'tagline' }, lvl.tagline)),
      ),
      h('div', { style: 'color:#5b4a86;font-weight:600' }, 'Desafio extra: não vale estrela da campanha nem ursinho dourado, mas rende Divertis e diversão.'),
      h('div', { style: 'font-weight:700;font-size:18px;margin-top:6px' }, 'Escolha seu estilo:'),
      difficultyPicker(g, diff, (d) => (diff = d), true),
      h('div', { class: 'row center wrap', style: 'margin-top:8px' }, btn(g, 'JOGAR', { icon: '▶', cls: 'big green', onClick: () => (close(), g.startLevel(lvl.id, diff, false)) })),
    );
    const close = g.ui.modal(card);
  }

  private async chestClick(c: ChestDef) {
    const g = this.game;
    const s = g.services;
    const st = s.progression.chestState(c, this.world.id);
    if (st === 'locked') {
      g.audio.play('softError');
      g.ui.toast('⭐', `Junte ${c.stars} estrelas nas aventuras para abrir!`);
      return;
    }
    if (st === 'opened') {
      g.ui.toast('📭', 'Esse baú já foi aberto!');
      return;
    }
    const res = s.progression.openChest(c.id);
    if (!res) return;
    s.achievements.check();
    g.audio.play('chest');
    const item = res.itemId ? getItem(res.itemId) : null;
    const big = h('div', { style: 'font-size:110px;text-align:center;animation:shake .8s' }, '🎁');
    const content = h('div', { class: 'panel', style: 'text-align:center' }, h('h2', { class: 'title-l' }, 'Baú aberto!'), big, h('div', { class: 'reward-lines' }));
    const close = g.ui.modal(content, { onClose: () => g.goMap() });
    await wait(800);
    big.textContent = '🎉';
    const lines = content.querySelector('.reward-lines')!;
    lines.append(h('div', { class: 'reward-line' }, '🪙', 'Divertis', h('span', { class: 'amt' }, `+${res.divertis}`)));
    if (item) lines.append(h('div', { class: 'unlock-banner item' }, `${item.icon} Novo item: ${item.name}!`));
    g.audio.play('star');
    content.append(btn(g, 'Oba!', { icon: '✔', cls: 'green', onClick: () => close() }));
  }
}
