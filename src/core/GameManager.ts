import { AudioManager } from '../audio/AudioManager';
import { Narrator } from '../audio/Narrator';
import { defaultLook } from '../engine/character/looks';
import { PortraitFactory } from '../engine/PortraitFactory';
import { Renderer } from '../engine/Renderer';
import { Showroom } from '../engine/Showroom';
import { InputManager } from '../input/InputManager';
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
import { MapScreen, type MapEnterOptions } from '../ui/screens/MapScreen';
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
    this.state = 'map';
    this.audio.playMusic('map');
    this.ui.show(new MapScreen(this, opts));
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

  async startLevel(levelId: string, difficulty: DifficultyId, resume: boolean): Promise<void> {
    const level = getLevel(levelId);
    const profile = this.profile;
    if (!level || !profile || !this.canPlay(levelId)) return;
    this.disposeLevel();
    this.state = 'loading';
    this.ui.show(new LoadingScreen(this, level.name, level.icon));
    const services = this.services;
    services.profiles.setPreferredDifficulty(difficulty);
    if (!resume) services.progression.clearInProgress(levelId);
    services.progression.startRun(levelId, difficulty);

    const runId = ++this.runId;
    const hud = new HudScreen(this, level);
    const params = getDifficultyParams(difficulty, level.difficultyOverrides);
    const runtime = createRuntime(level.contentId, {
      level,
      difficulty,
      params,
      character: profile.character,
      look: services.customization.resolveLook(profile.character),
      firstTime: !services.progression.progress(levelId).completed,
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
      checkpoint: (run) => runId === this.runId && services.progression.saveInProgress(run),
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
    const snap = this.level?.snapshot();
    if (snap) this.services.progression.saveInProgress(snap);
    void this.services.save.flush();
    this.paused = false;
    this.pauseClose = null;
    this.goMap();
  }

  replayLevel(): void {
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
