import type { GameManager } from '../../core/GameManager';
import type { CharacterId } from '../../core/types';
import type { LevelData } from '../../data/levelTypes';
import type { HudApi } from '../../levels/LevelRuntime';
import { h } from '../dom';
import { Screen } from '../UIManager';
import { btn, speech } from '../components/widgets';
import { SwipeControls, TouchControls } from '../components/TouchControls';
import { formatTime } from './MapScreen';

/**
 * HUD durante a fase (seção 31): só o necessário — Divertis, objetivos de estrela,
 * missão atual e pausa. Falas do mascote aparecem e somem sozinhas.
 */
export class HudScreen extends Screen implements HudApi {
  private coinsEl!: HTMLElement;
  private coinsPill!: HTMLElement;
  private objsEl!: HTMLElement;
  private missionEl!: HTMLElement;
  private speechSlot!: HTMLElement;
  private promptEl!: HTMLElement;
  private fadeEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private touch: TouchControls | SwipeControls | null = null;
  private controlsMode: 'move' | 'pointer' | 'swipe' = 'move';
  private panelSlot!: HTMLElement;
  private panelEl: HTMLElement | null = null;
  private coinsVisible = true;
  private touchSlot!: HTMLElement;
  private speechTimer: ReturnType<typeof setTimeout> | null = null;
  private objectives: { icon: string; label: string; done: boolean }[] = [];
  private rotateHint: HTMLElement | null = null;

  constructor(
    game: GameManager,
    private level: LevelData,
  ) {
    super(game);
  }

  build(): HTMLElement {
    const g = this.game;
    this.coinsEl = h('span', null, '0');
    this.coinsPill = h('div', { class: 'pill hud-coins' }, h('span', { class: 'ico' }, '🪙'), this.coinsEl);
    this.objsEl = h('div', { class: 'hud-objs' });
    this.missionEl = h('div', { class: 'pill hud-mission' }, '🎯 ...');
    this.timerEl = h('div', { class: 'pill hud-timer', style: 'display:none' });
    this.speechSlot = h('div', { class: 'hud-speech' });
    this.promptEl = h('div', { class: 'hud-prompt', style: 'display:none', role: 'button', 'aria-label': 'Interagir' });
    this.promptEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      g.input.press('interact');
    });
    this.fadeEl = h('div', { class: 'fade' });
    this.touchSlot = h('div', { style: 'position:absolute;inset:0;pointer-events:none' });
    const pause = btn(g, null, { icon: '⏸', cls: 'round white', aria: 'Pausar', onClick: () => g.openPause() });
    const top = h(
      'div',
      { class: 'hud-top' },
      h('div', { class: 'hud-left' }, this.coinsPill, this.objsEl),
      this.missionEl,
      this.timerEl,
      pause,
    );
    this.panelSlot = h('div', { class: 'hud-panel' });
    if (this.panelEl) this.panelSlot.append(this.panelEl);
    this.coinsPill.style.display = this.coinsVisible ? '' : 'none';
    const el = h('div', { class: 'screen hud passthrough' }, this.touchSlot, top, this.panelSlot, this.speechSlot, this.promptEl, this.fadeEl);
    // Aplica o que a fase já informou antes do HUD aparecer (durante o carregamento).
    this.coinsEl.textContent = this.coinsText;
    this.renderObjectives();
    this.missionEl.textContent = this.missionText;
    return el;
  }

  onShow() {
    this.refreshTouch();
    window.addEventListener('resize', this.checkOrientation);
    this.checkOrientation();
  }

  onHide() {
    window.removeEventListener('resize', this.checkOrientation);
    this.touch?.reset();
    if (this.speechTimer) clearTimeout(this.speechTimer);
  }

  private checkOrientation = () => {
    const portraitPhone = this.useTouch() && this.controlsMode !== 'pointer' && window.innerHeight > window.innerWidth * 1.15;
    if (portraitPhone && !this.rotateHint) {
      this.rotateHint = h('div', { class: 'rotate-hint' }, '📱↻', h('br'), 'Vire o celular de lado para jogar melhor!');
      this.el.append(this.rotateHint);
      setTimeout(() => {
        this.rotateHint?.remove();
      }, 4000);
    } else if (!portraitPhone && this.rotateHint) {
      this.rotateHint.remove();
      this.rotateHint = null;
    }
  };

  private useTouch(): boolean {
    const mode = this.game.settings.touchControls;
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return this.game.input.lastDevice === 'touch' || (matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0);
  }

  refreshTouch() {
    if (!this.el) return;
    const on = this.useTouch();
    this.el.classList.toggle('touch', on);
    const want = !on || this.controlsMode === 'pointer' ? null : this.controlsMode;
    const has = this.touch instanceof SwipeControls ? 'swipe' : this.touch ? 'move' : null;
    if (want !== has) {
      if (this.touch) {
        this.touch.reset();
        this.touch.el.remove();
        this.touch = null;
      }
      if (want) {
        this.touch = want === 'swipe' ? new SwipeControls(this.game.input) : new TouchControls(this.game.input);
        this.touchSlot.append(this.touch.el);
        this.touch.el.style.pointerEvents = 'none';
      }
    }
    this.renderPrompt();
  }

  // ------------------------------------------------------------------ HudApi

  setControls(mode: 'move' | 'pointer' | 'swipe') {
    this.controlsMode = mode;
    this.refreshTouch();
  }

  mountPanel(el: HTMLElement | null) {
    this.panelEl = el;
    if (!this.panelSlot) return;
    this.panelSlot.replaceChildren(...(el ? [el] : []));
  }

  showCoins(on: boolean) {
    this.coinsVisible = on;
    if (this.coinsPill) this.coinsPill.style.display = on ? '' : 'none';
  }

  private coinsText = '0';
  private missionText = '🎯 ...';

  setCoins(collected: number, total: number) {
    this.coinsText = `${collected}/${total}`;
    if (this.coinsEl) this.coinsEl.textContent = this.coinsText;
  }

  private renderObjectives() {
    this.objsEl.replaceChildren(
      ...this.objectives.map((o) => h('div', { class: `hud-obj ${o.done ? 'done' : ''}`, title: o.label, 'aria-label': o.label }, o.icon)),
    );
  }

  setObjectives(list: { icon: string; label: string; done: boolean }[]) {
    const had = this.objectives.length > 0;
    const before = this.objectives.filter((o) => o.done).length;
    this.objectives = list;
    if (!this.objsEl) return;
    this.renderObjectives();
    const after = list.filter((o) => o.done).length;
    if (had && after > before) {
      this.game.audio.play('star');
      this.toast('⭐', 'Objetivo de estrela cumprido!');
    }
  }

  setMission(icon: string, text: string) {
    const t = `${icon} ${text}`;
    if (this.missionText === t) return;
    this.missionText = t;
    if (!this.missionEl) return;
    this.missionEl.textContent = t;
    this.missionEl.classList.remove('flash');
    void this.missionEl.offsetWidth;
    this.missionEl.classList.add('flash');
  }

  say(speaker: CharacterId, text: string, icon?: string) {
    if (!this.speechSlot) return;
    if (this.speechTimer) clearTimeout(this.speechTimer);
    const sp = speech(this.game, speaker, text, icon);
    this.speechSlot.replaceChildren(sp);
    this.speechTimer = setTimeout(() => sp.remove(), Math.max(4200, text.length * 85 + 2000));
  }

  sayAs(name: string, portraitIcon: string, text: string) {
    if (!this.speechSlot) return;
    if (this.speechTimer) clearTimeout(this.speechTimer);
    const sp = h(
      'div',
      { class: 'speech', role: 'status' },
      h('span', { class: 'portrait', style: 'background:radial-gradient(circle at 50% 35%,#fff,#ffd6ec)' }, portraitIcon),
      h('div', { class: 'bubble' }, h('span', { class: 'who' }, name), text),
    );
    sp.addEventListener('click', () => this.game.speak(text));
    this.game.speak(text);
    this.speechSlot.replaceChildren(sp);
    this.speechTimer = setTimeout(() => sp.remove(), Math.max(4500, text.length * 85 + 2200));
  }

  private prompt: string | null = null;
  setPrompt(icon: string | null) {
    this.prompt = icon;
    this.renderPrompt();
  }

  private renderPrompt() {
    if (!this.promptEl) return;
    if (!this.prompt) {
      this.promptEl.style.display = 'none';
      return;
    }
    this.promptEl.style.display = 'flex';
    const touch = this.useTouch();
    this.promptEl.replaceChildren(h('span', null, touch ? '✋' : this.prompt));
    if (!touch) this.promptEl.append(h('span', { class: 'key' }, 'tecla E'));
  }

  coinFly(x: number, y: number, kind: 'coin' | 'gem') {
    if (!this.el) return;
    const el = h('div', { class: 'coin-fly', style: `left:${x - 15}px;top:${y - 15}px` }, kind === 'gem' ? '💎' : '🪙');
    this.el.append(el);
    const target = this.coinsPill.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transform = `translate(${target.left + 20 - x}px, ${target.top + 18 - y}px) scale(0.7)`;
      el.style.opacity = '0.3';
    });
    setTimeout(() => {
      el.remove();
      this.coinsPill.classList.remove('bump');
      void this.coinsPill.offsetWidth;
      this.coinsPill.classList.add('bump');
    }, 560);
  }

  toast(icon: string, text: string) {
    this.game.ui.toast(icon, text);
  }

  fade(on: boolean): Promise<void> {
    if (!this.fadeEl) return Promise.resolve();
    this.fadeEl.classList.toggle('on', on);
    return new Promise((r) => setTimeout(r, 200));
  }

  setTimer(sec: number | null) {
    if (!this.timerEl) return;
    this.timerEl.style.display = sec === null ? 'none' : '';
    if (sec !== null) this.timerEl.textContent = `⏱️ ${formatTime(sec)}`;
  }

  // ------------------------------------------------------------------ pausa

  openPauseMenu(onResume: () => void): () => void {
    const g = this.game;
    const objs = h(
      'div',
      { class: 'objectives' },
      ...this.objectives.map((o) =>
        h('div', { class: `objective ${o.done ? 'done' : ''}` }, h('span', { class: 'o-ico' }, o.icon), o.label, h('span', { class: `o-star ${o.done ? '' : 'off'}` }, '⭐')),
      ),
    );
    const panel = h(
      'div',
      { class: 'panel', style: 'text-align:center' },
      h('h2', { class: 'title-l' }, '⏸ Pausa'),
      h('div', { style: 'color:#5b4a86;font-weight:600' }, this.level.name),
      objs,
      h(
        'div',
        { class: 'col center' },
        btn(g, 'Continuar', { icon: '▶', cls: 'big green', onClick: () => onResume() }),
        h(
          'div',
          { class: 'row center wrap' },
          btn(g, 'Voltar ao checkpoint', { icon: '🚩', cls: 'white', onClick: () => g.restartCheckpoint() }),
          btn(g, 'Ajustes', { icon: '⚙️', cls: 'white', onClick: () => g.openSettings() }),
        ),
        btn(g, 'Sair para o mapa', { icon: '🗺️', cls: 'orange', onClick: () => g.quitLevel() }),
        h('div', { style: 'font-size:15px;color:#5b4a86' }, 'Seu progresso fica guardado! 💾'),
      ),
    );
    this.touch?.reset();
    return g.ui.modal(panel, { onClose: () => onResume() });
  }
}
