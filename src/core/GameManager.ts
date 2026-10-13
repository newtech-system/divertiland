import { AudioManager } from '../audio/AudioManager';
import { Narrator } from '../audio/Narrator';
import { defaultLook } from '../engine/character/looks';
import { PortraitFactory } from '../engine/PortraitFactory';
import { Renderer } from '../engine/Renderer';
import { Showroom } from '../engine/Showroom';
import { InputManager } from '../input/InputManager';
import { pollViewport } from '../ui/viewport';
import { getDifficultyParams } from '../data/difficulty';
import { getLevel } from '../data/worlds';
import { createRuntime, hasContent } from '../levels/registry';
import type { LevelRuntime } from '../levels/LevelRuntime';
import { GameServices } from '../systems/GameServices';
import type { LevelOutcome, LevelRunResult } from '../systems/LevelResult';
import type { ProfileData, SettingsData } from '../systems/save/SaveTypes';
import { LocalStorageAdapter } from '../systems/save/StorageAdapter';
import { HudScreen } from '../ui/screens/HudScreen';
import { LoadingScreen } from '../ui/screens/LoadingScreen';
import { AdventureMapScreen, type MapEnterOptions } from '../ui/screens/AdventureMapScreen';
import { AdventureResultsScreen, StageDoneScreen } from '../ui/screens/AdventureResultsScreen';
import { getAdventure } from '../data/adventures';
import { ProfileCreateScreen } from '../ui/screens/ProfileCreateScreen';
import { ProfileSelectScreen } from '../ui/screens/ProfileSelectScreen';
import { ResultsScreen } from '../ui/screens/ResultsScreen';
import { ShopScreen } from '../ui/screens/ShopScreen';
import { TitleScreen } from '../ui/screens/TitleScreen';
import { openSettings } from '../ui/screens/SettingsModal';
import { UIManager } from '../ui/UIManager';
import { createLogger } from './Logger';
import type { CharacterId, DifficultyId } from './types';

const log = createLogger('Game');

export type GameState = 'boot' | 'title' | 'profiles' | 'create' | 'map' | 'loading' | 'level' | 'results' | 'shop';

/**
 * GameManager (seção 33): orquestra estados do jogo, o loop principal e a ligação entre
 * sistemas de regras (GameServices), motor 3D, áudio, entrada e interface.
 */
export class GameManager {
  readonly services = new GameServices(new LocalStorageAdapter());
  readonly audio = new AudioManager();
  readonly narrator = new Narrator();
  readonly input = new InputManager();
  readonly renderer: Renderer;
  readonly showroom: Showroom;
  readonly portraits: PortraitFactory;
  readonly ui: UIManager;
  state: GameState = 'boot';
  level: LevelRuntime | null = null;
  levelId: string | null = null;
  levelDifficulty: DifficultyId = 'monkey';
  hud: HudScreen | null = null;
  private last = performance.now();
  fps = 60;
  private paused = false;
  /** Identifica a partida atual (eventos de partidas antigas são ignorados). */
  private runId = 0;
  /**
   * Aventura em curso: qual aventura e qual jogada (etapa) está rodando. É isto que faz
   * o resultado ir para o AdventureService em vez do caminho antigo de fase solta —
   * NUNCA os dois, senão cada recompensa seria paga duas vezes.
   */
  private adventureRun: { id: string; runIndex: number } | null = null;
  private pauseClose: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.showroom = new Showroom(this.renderer);
    this.portraits = new PortraitFactory(this.renderer.gl);
    this.ui = new UIManager(container, this);
    this.input.attach(this.renderer.canvas);
    this.input.onDeviceChange = () => this.hud?.refreshTouch();
    // Áudio só pode começar após um gesto do usuário (regra dos navegadores).
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'level' && !this.paused) this.openPause();
        void this.services.save.flush();
      }
    });
    window.addEventListener('pagehide', () => void this.services.save.flush());
    this.services.bus.on('saveError', () => this.ui.toast('⚠️', 'Não consegui salvar agora. Vou tentar de novo!'));
  }

  get settings(): SettingsData {
    return this.services.save.data.settings;
  }

  get profile(): ProfileData | null {
    return this.services.profiles.active;
  }

  async start(): Promise<void> {
    await this.services.init();
    this.applySettings();
    this.loop();
    this.goTitle();
    log.info('Divertiland iniciado.');
  }

  // ------------------------------------------------------------------ loop

  private loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.fps = this.fps * 0.95 + (1 / Math.max(1e-3, dt)) * 0.05;
    pollViewport(now);
    this.input.update();
    try {
      if (this.input.state.pressed.has('pause') && (this.state === 'level' || this.paused)) {
        if (this.paused) this.closePause();
        else this.openPause();
      }
      this.ui.current?.update(dt);
      if (this.level && (this.state === 'level' || this.state === 'results')) {
        this.level.update(dt);
        this.level.render();
      } else {
        this.renderer.clear();
      }
      if (this.showroom.active) {
        this.showroom.update(dt);
        this.showroom.render();
      }
    } catch (e) {
      // Um erro num quadro não pode travar o jogo inteiro.
      log.error('Erro no loop', e);
    }
    requestAnimationFrame(this.loop);
  };

  // ------------------------------------------------------------------ configurações

  applySettings(): void {
    const s = this.settings;
    this.audio.setVolumes(s.masterVolume, s.musicVolume, s.sfxVolume);
    this.narrator.enabled = s.narration;
    this.input.cameraSensitivity = s.cameraSensitivity;
    this.input.invertY = s.invertCameraY;
    this.renderer.setQuality(s.quality);
    document.body.classList.toggle('reduced-motion', s.reducedMotion);
    this.hud?.refreshTouch();
  }

  updateSettings(patch: Partial<SettingsData>): void {
    Object.assign(this.settings, patch);
    this.services.save.markDirty();
    this.applySettings();
  }

  /** Fala do mascote em voz alta (vozes locais do aparelho). */
  speak(text: string, speaker?: CharacterId): void {
    if (!this.settings.narration) return;
    const dur = this.narrator.say(text, { pitch: speaker === 'mina' ? 1.45 : speaker === 'jhow' ? 1.05 : 1.2 });
    if (dur > 0) this.audio.duck(dur);
  }

  // ------------------------------------------------------------------ retratos

  portraitFor(profile: ProfileData | null = this.profile): string {
    if (!profile) return '';
    return this.portraits.make(profile.character, this.services.customization.resolveLook(profile.character));
  }

  /** Retrato de um mascote com o visual padrão (para falas). */
  mascotPortrait(c: CharacterId): string {
    return this.portraits.make(c, defaultLook(c));
  }

  // ------------------------------------------------------------------ navegação

  goTitle(): void {
    this.state = 'title';
    this.audio.playMusic('menu');
    this.ui.show(new TitleScreen(this));
  }

  /** Depois do título: escolhe perfil, cria um novo ou vai direto ao mapa. */
  afterTitle(): void {
    const profiles = this.services.profiles.list;
    if (profiles.length === 0) this.goCreateProfile();
    else if (profiles.length === 1) {
      this.services.profiles.select(profiles[0].id);
      this.goMap({ greet: true });
    } else this.goProfiles();
  }

  goProfiles(): void {
    this.state = 'profiles';
    this.audio.playMusic('menu');
    this.ui.show(new ProfileSelectScreen(this));
  }

  goCreateProfile(): void {
    this.state = 'create';
    this.audio.playMusic('menu');
    this.ui.show(new ProfileCreateScreen(this));
  }

  goMap(opts: MapEnterOptions = {}): void {
    this.disposeLevel();
    this.adventureRun = null;
    this.state = 'map';
    this.audio.playMusic('map');
    this.ui.show(new AdventureMapScreen(this, opts));
  }

  openShop(): void {
    this.state = 'shop';
    this.audio.playMusic('shop');
    this.ui.show(new ShopScreen(this));
  }

  openSettings(): void {
    openSettings(this);
  }

  // ------------------------------------------------------------------ fases

  canPlay(levelId: string): boolean {
    const lvl = getLevel(levelId);
    return !!lvl && lvl.implemented && hasContent(lvl.contentId);
  }

  /**
   * Começa (ou retoma) a aventura: escolhe a jogada certa — a que tem etapas pendentes —
   * e deixa o resultado marcado para ir pelo caminho das aventuras.
   */
  startAdventure(adventureId: string, difficulty: DifficultyId, resume: boolean): void {
    const adv = getAdventure(adventureId);
    if (!adv) return;
    const runIndex = this.services.adventures.runIndexToPlay(adventureId);
    const run = adv.runs[runIndex];
    if (!run) return;
    void this.startLevel(run.levelId, difficulty, resume, { id: adventureId, runIndex });
  }

  /** Botão "Continuar a aventura" da tela de etapa concluída. */
  continueAdventure(): void {
    const next = this.nextRun;
    this.nextRun = null;
    if (!next) {
      this.goMap();
      return;
    }
    this.startAdventure(next.id, next.difficulty, false);
  }

  /** Entra no terreno do Meu Mundo (espaço livre: sem estrela e sem recompensa). */
  openMeuMundo(): void {
    const p = this.profile;
    if (!p) return;
    void this.startLevel('meu_mundo', p.preferredDifficulty, false);
  }

  private nextRun: { id: string; difficulty: DifficultyId } | null = null;

  async startLevel(
    levelId: string,
    difficulty: DifficultyId,
    resume: boolean,
    adventure: { id: string; runIndex: number } | null = null,
  ): Promise<void> {
    const level = getLevel(levelId);
    const profile = this.profile;
    if (!level || !profile || !this.canPlay(levelId)) return;
    this.disposeLevel();
    this.adventureRun = adventure;
    this.state = 'loading';
    this.ui.show(new LoadingScreen(this, level.name, level.icon));
    const services = this.services;
    if (!level.sandbox) services.profiles.setPreferredDifficulty(difficulty);
    if (!resume && !level.sandbox) services.progression.clearInProgress(levelId);
    if (!level.sandbox) services.progression.startRun(levelId, difficulty);

    const runId = ++this.runId;
    const hud = new HudScreen(this, level);
    const params = getDifficultyParams(difficulty, level.difficultyOverrides);
    const runtime = createRuntime(level.contentId, {
      level,
      difficulty,
      params,
      character: profile.character,
      look: services.customization.resolveLook(profile.character),
      firstTime: adventure
        ? !services.adventures.progress(adventure.id).completed
        : !services.progression.progress(levelId).completed,
      settings: this.settings,
      resume: resume ? profile.inProgress : null,
      renderer: this.renderer,
      input: this.input,
      audio: this.audio,
      narrator: this.narrator,
      hud,
      addStat: (k, n) => services.profiles.addStat(k, n),
      // Só aceita eventos da partida ATUAL (uma partida antiga já descartada é ignorada).
      finish: (r) => runId === this.runId && this.onLevelFinished(r),
      // Espaço livre nunca ocupa a vaga de "partida em andamento" de uma aventura.
      checkpoint: (run) => runId === this.runId && !level.sandbox && services.progression.saveInProgress(run),
    });
    if (!runtime) {
      this.goMap();
      return;
    }
    try {
      await Promise.all([runtime.load(), new Promise((r) => setTimeout(r, 450))]);
    } catch (e) {
      log.error('Falha ao carregar fase', e);
      this.ui.toast('😅', 'Ops! Essa fase não abriu. Tente de novo.');
      runtime.dispose();
      this.goMap();
      return;
    }
    this.level = runtime;
    this.levelId = levelId;
    this.levelDifficulty = difficulty;
    this.hud = hud;
    this.state = 'level';
    this.paused = false;
    this.input.reset();
    this.input.enabled = true;
    this.audio.playMusic('world1');
    this.ui.show(hud);
  }

  private onLevelFinished(result: LevelRunResult) {
    if (this.state !== 'level') return;
    const level = this.levelId ? getLevel(this.levelId) : null;
    // Espaço livre (Meu Mundo): "chegar no portal" só significa voltar ao mapa.
    if (level?.sandbox) {
      this.goMap();
      return;
    }
    if (this.adventureRun) {
      this.finishAdventureRun(result);
      return;
    }
    let outcome: LevelOutcome;
    try {
      outcome = this.services.completion.apply(result);
    } catch (e) {
      log.error('Falha ao aplicar resultado', e);
      this.goMap();
      return;
    }
    this.state = 'results';
    this.input.enabled = false;
    this.hud = null;
    this.ui.show(new ResultsScreen(this, result, outcome));
  }

  /** Resultado de uma jogada de aventura: etapa concluída ou aventura terminada. */
  private finishAdventureRun(result: LevelRunResult) {
    const run = this.adventureRun!;
    let applied;
    try {
      applied = this.services.adventures.applyRun(run.id, run.runIndex, result);
    } catch (e) {
      log.error('Falha ao aplicar resultado da aventura', e);
      this.goMap();
      return;
    }
    this.state = 'results';
    this.input.enabled = false;
    this.hud = null;
    if (applied.kind === 'done') {
      this.adventureRun = null;
      this.ui.show(new AdventureResultsScreen(this, result, applied.outcome));
      return;
    }
    if (applied.kind === 'nextRun') {
      this.nextRun = { id: run.id, difficulty: result.difficulty };
      this.ui.show(new StageDoneScreen(this, run.id, applied, result));
      return;
    }
    this.goMap();
  }

  openPause(): void {
    if (this.state !== 'level' || !this.level || this.paused) return;
    this.paused = true;
    this.level.setPaused(true);
    this.input.enabled = false;
    this.audio.play('pop');
    this.pauseClose = this.hud?.openPauseMenu(() => this.closePause()) ?? null;
  }

  closePause(): void {
    if (!this.paused) return;
    this.paused = false;
    this.pauseClose?.();
    this.pauseClose = null;
    this.level?.setPaused(false);
    this.input.reset();
    this.input.enabled = true;
  }

  restartCheckpoint(): void {
    this.closePause();
    this.level?.restartFromCheckpoint();
  }

  /** Sair no meio: guarda o progresso parcial (estado IN_PROGRESS) e volta ao mapa. */
  quitLevel(): void {
    const level = this.levelId ? getLevel(this.levelId) : null;
    const snap = level?.sandbox ? null : this.level?.snapshot();
    // Sair no meio da aventura guarda o que é PERMANENTE (ursinhos dourados e segredos):
    // se a criança achar um ursinho e sair, ele continua na coleção dela mesmo que ela
    // recomece a etapa do zero depois.
    if (this.adventureRun && this.level) {
      try {
        this.services.adventures.applyRun(this.adventureRun.id, this.adventureRun.runIndex, this.level.partialResult());
      } catch (e) {
        log.warn('Não consegui guardar as descobertas da aventura', e);
      }
    }
    if (snap) this.services.progression.saveInProgress(snap);
    void this.services.save.flush();
    this.paused = false;
    this.pauseClose = null;
    this.goMap();
  }

  replayLevel(): void {
    if (this.adventureRun) {
      this.startAdventure(this.adventureRun.id, this.levelDifficulty, false);
      return;
    }
    if (this.levelId) void this.startLevel(this.levelId, this.levelDifficulty, false);
  }

  private disposeLevel() {
    this.runId++;
    if (this.level) {
      try {
        this.level.dispose();
      } catch (e) {
        log.warn('Erro ao descartar fase', e);
      }
    }
    this.level = null;
    this.hud = null;
    this.input.enabled = true;
    this.narrator.stop();
  }
}
