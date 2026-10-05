import type { GameManager } from '../../core/GameManager';
import type { DifficultyId } from '../../core/types';
import { CHARACTERS } from '../../data/characters';
import { getItem } from '../../data/items';
import type { ChestDef, LevelData } from '../../data/levelTypes';
import { WORLDS } from '../../data/worlds';
import { otherCharacter } from '../../engine/character/looks';
import { h, stars, wait } from '../dom';
import { Screen } from '../UIManager';
import { LEVEL_TYPE_LABEL, btn, difficultyPicker, portraitImg, speech } from '../components/widgets';
import { openAchievements } from './AchievementsModal';

export interface MapEnterOptions {
  greet?: boolean;
  firstTime?: boolean;
  /** Fases recém-desbloqueadas (ganham destaque). */
  unlocked?: string[];
  justCompleted?: string;
}

const STEP = 150;
const PAD_BOTTOM = 190;
const PAD_TOP = 260;

/**
 * MAPA DE PROGRESSÃO (seção 7): caminho visual com fases, estrelas, cadeados, baús,
 * desafio especial e fase bônus. A criança vê onde está e o que vem depois.
 */
export class MapScreen extends Screen {
  private scroll!: HTMLElement;
  private world = WORLDS[0];
  private bottom!: HTMLElement;

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
    const world = this.world;
    const levels = world.levels.filter((l) => l.map.style !== 'secret' || s.progression.getState(l.id) !== 'LOCKED');
    const maxY = Math.max(...world.levels.map((l) => l.map.y));
    const height = PAD_BOTTOM + maxY * STEP + PAD_TOP;
    const posOf = (x: number, y: number) => ({ left: x, bottom: PAD_BOTTOM + y * STEP });

    const worldEl = h('div', { class: 'map-world', style: `height:${height}px` }, h('div', { class: 'map-bg' }));

    // Decoração do mapa
    const decos = ['🎈', '🎠', '🍭', '⭐', '🎪', '🎡', '🎢', '🧁', '🎉', '🪁'];
    for (let i = 0; i < 14; i++) {
      const y = 60 + i * (height / 14);
      const x = i % 2 ? 6 + ((i * 7) % 10) : 82 + ((i * 5) % 10);
      worldEl.append(h('div', { class: 'map-deco', style: `left:${x}%;bottom:${y}px;animation-delay:${i * 0.4}s` }, decos[i % decos.length]));
    }

    // Caminho (SVG)
    const ordered = levels.filter((l) => l.map.style !== 'secret').sort((a, b) => a.order - b.order);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map-path');
    svg.setAttribute('viewBox', `0 0 100 ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const pt = (l: LevelData) => [l.map.x, height - (PAD_BOTTOM + l.map.y * STEP)] as const;
    const startPt = [50, height - 40] as const;
    const segs: { d: string; done: boolean }[] = [];
    let prev: readonly [number, number] = startPt;
    ordered.forEach((l, i) => {
      const [x, y] = pt(l);
      const midY = (prev[1] + y) / 2;
      segs.push({ d: `M ${prev[0]} ${prev[1]} C ${prev[0]} ${midY}, ${x} ${midY}, ${x} ${y}`, done: i === 0 || s.progression.getState(ordered[i - 1].id) === 'COMPLETED' });
      prev = [x, y];
    });
    for (const seg of segs) {
      const mk = (stroke: string, width: number, dash?: string) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', seg.d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', stroke);
        path.setAttribute('stroke-width', String(width));
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        if (dash) path.setAttribute('stroke-dasharray', dash);
        svg.appendChild(path);
      };
      mk('rgba(60,10,140,0.35)', 26);
      mk(seg.done ? '#ffd60a' : 'rgba(255,255,255,0.85)', 16, seg.done ? undefined : '2 22');
    }
    // Linha pontilhada até a fase secreta
    const secret = levels.find((l) => l.map.style === 'secret');
    if (secret) {
      const from = pt(world.levels[0]);
      const to = pt(secret);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${from[0]} ${from[1]} Q ${(from[0] + to[0]) / 2 + 10} ${from[1] - 60}, ${to[0]} ${to[1]}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#ff9ccc');
      path.setAttribute('stroke-width', '10');
      path.setAttribute('stroke-dasharray', '1 16');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(path);
    }
    worldEl.append(svg);

    // Início
    worldEl.append(h('div', { class: 'world-banner', style: `bottom:${20}px` }, '🚩 INÍCIO'));

    // Fases
    const currentId = s.progression.currentLevelId(world.id);
    for (const l of levels) {
      const state = s.progression.getState(l.id);
      const prog = s.progression.progress(l.id);
      const pos = posOf(l.map.x, l.map.y);
      const isNew = this.opts.unlocked?.includes(l.id);
      const node = h(
        'div',
        {
          class: `map-node ${state.toLowerCase()} ${l.map.style}`,
          style: `left:${pos.left}%;bottom:${pos.bottom}px`,
          role: 'button',
          'aria-label': `${l.name} — ${state}`,
          onclick: () => this.openLevel(l),
        },
        h(
          'div',
          { class: 'bubble' },
          h('span', { class: 'icon' }, l.icon),
          state === 'LOCKED' ? h('span', { class: 'lock' }, '🔒') : null,
          l.map.style !== 'secret' ? h('span', { class: 'num' }, l.order) : null,
          state !== 'LOCKED' && !l.implemented ? h('span', { class: 'soon' }, '🚧 em breve') : null,
          state === 'IN_PROGRESS' || (p.inProgress?.levelId === l.id && state === 'COMPLETED') ? h('span', { class: 'inprog' }, '⏯️') : null,
        ),
        stars(prog.bestStars),
        h('div', { class: 'label' }, l.name),
      );
      if (isNew) node.style.animation = 'popIn 0.8s cubic-bezier(0.2,1.6,0.4,1) 0.6s backwards';
      worldEl.append(node);
      if (l.id === currentId) {
        worldEl.append(
          h('div', { class: 'map-avatar', style: `left:${pos.left}%;bottom:${pos.bottom + 70}px` }, portraitImg(g.portraitFor(), p.character)),
        );
      }
    }

    // Baús
    for (const c of world.chests) {
      const st = s.progression.chestState(c, world.id);
      const pos = posOf(c.map.x, c.map.y);
      worldEl.append(
        h(
          'div',
          { class: `map-chest ${st}`, style: `left:${pos.left}%;bottom:${pos.bottom}px`, role: 'button', onclick: () => this.chestClick(c) },
          h('div', { class: 'box' }, st === 'opened' ? '📭' : '🎁'),
          h('div', { class: 'req' }, st === 'opened' ? '✔' : `⭐ ${c.stars}`),
        ),
      );
    }

    // Próximo mundo (setor seguinte)
    worldEl.append(h('div', { class: 'world-banner next', style: `top:${40}px` }, '🔒 Próximo mundo: em breve!'));

    this.scroll = h('div', { class: 'map-scroll' }, worldEl);

    const top = h(
      'div',
      { class: 'map-top' },
      h('div', { class: 'who', role: 'button', onclick: () => (g.audio.play('button'), g.goProfiles()) }, portraitImg(g.portraitFor(), p.character), p.name),
      h('div', { class: 'pill' }, h('span', { class: 'ico' }, '🪙'), String(p.divertis)),
      h('div', { class: 'pill' }, h('span', { class: 'ico' }, '⭐'), String(s.progression.totalStars())),
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

  onShow() {
    const g = this.game;
    const s = g.services;
    // Rola até a fase atual
    const currentId = s.progression.currentLevelId(this.world.id);
    const lvl = this.world.levels.find((l) => l.id === currentId);
    requestAnimationFrame(() => {
      const total = this.scroll.scrollHeight;
      const y = lvl ? total - (PAD_BOTTOM + lvl.map.y * STEP) : total;
      this.scroll.scrollTop = Math.max(0, y - this.scroll.clientHeight * 0.6);
    });

    const guide = otherCharacter(g.profile!.character);
    let line: string | null = null;
    if (this.opts.firstTime) line = `Oi, ${g.profile!.name}! ${CHARACTERS[guide].lines.welcome[0]}`;
    else if (this.opts.unlocked?.length) line = 'Uma nova fase acendeu no mapa! Vamos lá?';
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

  private openLevel(l: LevelData) {
    const g = this.game;
    const s = g.services;
    const state = s.progression.getState(l.id);
    if (state === 'LOCKED') {
      g.audio.play('softError');
      const rule = l.unlock;
      if (rule.minStars && s.progression.totalStars() < rule.minStars && !rule.afterLevels?.some((id) => s.progression.getState(id) !== 'COMPLETED'))
        g.ui.toast('⭐', `Junte ${rule.minStars} estrelas para abrir!`);
      else g.ui.toast('🔒', 'Termine a fase anterior para abrir!');
      return;
    }
    g.audio.play('button');
    const prog = s.progression.progress(l.id);
    const p = g.profile!;
    let diff: DifficultyId = p.preferredDifficulty;
    const playable = g.canPlay(l.id);
    const inProgress = p.inProgress?.levelId === l.id ? p.inProgress : null;

    const objectives = h(
      'div',
      { class: 'objectives' },
      h('div', { class: `objective ${prog.completed ? 'done' : ''}` }, h('span', { class: 'o-ico' }, '🏁'), 'Chegar ao final', h('span', { class: `o-star ${prog.completed ? '' : 'off'}` }, '⭐')),
      ...l.objectives.map((o) => {
        const done = prog.objectivesMet.includes(o.id);
        return h(
          'div',
          { class: `objective ${done ? 'done' : ''}` },
          h('span', { class: 'o-ico' }, o.icon),
          o.label,
          h('span', { class: `o-star ${done ? '' : 'off'}` }, '⭐'),
        );
      }),
    );

    const actions = h('div', { class: 'col center', style: 'margin-top:8px' });
    if (!playable) {
      actions.append(
        h('div', { class: 'unlock-banner', style: 'background:linear-gradient(90deg,#ff8a00,#ffd60a);color:#2a1457' }, '🚧 Essa fase está sendo construída. Volte em breve!'),
      );
    } else {
      actions.append(
        h('div', { style: 'font-weight:700;font-size:18px' }, 'Escolha seu estilo:'),
        difficultyPicker(g, diff, (d) => (diff = d), true),
      );
      const row = h('div', { class: 'row center wrap' });
      if (inProgress) {
        row.append(
          btn(g, 'Recomeçar', { icon: '🔁', cls: 'white', onClick: () => (close(), g.startLevel(l.id, diff, false)) }),
          btn(g, 'Continuar', { icon: '▶', cls: 'big green', onClick: () => (close(), g.startLevel(l.id, inProgress.difficulty === diff ? diff : diff, inProgress.difficulty === diff)) }),
        );
      } else {
        row.append(btn(g, 'JOGAR', { icon: '▶', cls: 'big green', onClick: () => (close(), g.startLevel(l.id, diff, false)) }));
      }
      actions.append(row);
    }

    const extra: HTMLElement[] = [];
    if (prog.completed && prog.bestTimeSec) {
      extra.push(h('div', { style: 'text-align:center;color:#5b4a86;font-weight:600' }, `⏱️ Recorde: ${formatTime(prog.bestTimeSec)}   🪙 Melhor: ${prog.bestCoins}`));
    }
    if (prog.completedDifficulties.length) {
      extra.push(h('div', { style: 'text-align:center;font-size:26px' }, ...prog.completedDifficulties.map((d) => ({ sloth: '🦥', monkey: '🐒', jaguar: '🐆' })[d])));
    }
    const reward = l.rewardItemOnThreeStars ? getItem(l.rewardItemOnThreeStars) : null;

    const card = h(
      'div',
      { class: 'panel level-card' },
      h(
        'div',
        { class: 'head' },
        h('div', { class: 'big-icon' }, l.icon),
        h(
          'div',
          null,
          h('span', { class: 'type' }, LEVEL_TYPE_LABEL[l.type] ?? l.type),
          h('h2', { class: 'title-l', style: 'text-align:left' }, l.name),
          h('div', { class: 'tagline' }, l.tagline),
        ),
      ),
      h('div', { class: 'big-stars', style: 'margin-top:8px' }, ...[0, 1, 2].map((i) => h('span', { class: i < prog.bestStars ? '' : 'off' }, '⭐'))),
      objectives,
      reward && !prog.threeStarRewardClaimed
        ? h('div', { class: 'objective', style: 'background:#fff4c2' }, h('span', { class: 'o-ico' }, reward.icon), `3 estrelas ganham: ${reward.name}!`)
        : null,
      ...extra,
      actions,
    );
    const close = g.ui.modal(card);
    g.speak(l.name);
  }

  private async chestClick(c: ChestDef) {
    const g = this.game;
    const s = g.services;
    const st = s.progression.chestState(c, this.world.id);
    if (st === 'locked') {
      g.audio.play('softError');
      g.ui.toast('⭐', `Junte ${c.stars} estrelas neste mundo para abrir!`);
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
    const content = h(
      'div',
      { class: 'panel', style: 'text-align:center' },
      h('h2', { class: 'title-l' }, 'Baú aberto!'),
      big,
      h('div', { class: 'reward-lines' }),
    );
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

export function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
