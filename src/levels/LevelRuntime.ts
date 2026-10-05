import type { AudioManager } from '../audio/AudioManager';
import type { Narrator } from '../audio/Narrator';
import type { CharacterId, DifficultyId } from '../core/types';
import type { DifficultyParams } from '../data/difficulty';
import type { LevelData } from '../data/levelTypes';
import type { Renderer } from '../engine/Renderer';
import type { InputManager } from '../input/InputManager';
import type { ResolvedLook } from '../systems/CustomizationManager';
import type { LevelRunResult } from '../systems/LevelResult';
import type { InProgressRun, SettingsData } from '../systems/save/SaveTypes';

/** O que o HUD sabe mostrar (implementado pela camada de UI). */
export interface HudApi {
  setCoins(collected: number, total: number): void;
  setObjectives(list: { icon: string; label: string; done: boolean }[]): void;
  setMission(icon: string, text: string): void;
  say(speaker: CharacterId, text: string, icon?: string): void;
  /** Fala de outro personagem (amigos de pelúcia, etc.). */
  sayAs(name: string, portraitIcon: string, text: string): void;
  setPrompt(icon: string | null): void;
  coinFly(screenX: number, screenY: number, kind: 'coin' | 'gem'): void;
  toast(icon: string, text: string): void;
  fade(on: boolean): Promise<void>;
  setTimer(sec: number | null): void;
  /** Tipo de controle na tela: andar (joystick), tocar/apontar, ou deslizar (runner). */
  setControls(mode: 'move' | 'pointer' | 'swipe'): void;
  /** Painel específico da fase (ex.: lista de objetos), mostrado embaixo. */
  mountPanel(el: HTMLElement | null): void;
  /** Esconde o contador de Divertis quando a fase não tem moedas. */
  showCoins(on: boolean): void;
}

export interface LevelHost {
  level: LevelData;
  difficulty: DifficultyId;
  params: DifficultyParams;
  character: CharacterId;
  look: ResolvedLook;
  /** Primeira vez jogando esta fase (tutoriais aparecem). */
  firstTime: boolean;
  settings: SettingsData;
  resume: InProgressRun | null;
  renderer: Renderer;
  input: InputManager;
  audio: AudioManager;
  narrator: Narrator;
  hud: HudApi;
  addStat(key: string, n?: number): void;
  /** Fase terminou (concluída). */
  finish(result: LevelRunResult): void;
  /** Checkpoint alcançado — o host pode salvar o progresso parcial. */
  checkpoint(run: InProgressRun): void;
}

/** Contrato comum de TODOS os tipos de gameplay (exploração, runner, objetos escondidos...). */
export interface LevelRuntime {
  load(): Promise<void>;
  update(dt: number): void;
  render(): void;
  /** Resultado parcial (para sair no meio guardando segredos/colecionáveis). */
  partialResult(): LevelRunResult;
  snapshot(): InProgressRun | null;
  setPaused(p: boolean): void;
  restartFromCheckpoint(): void;
  dispose(): void;
  /** Ferramentas de desenvolvimento (opcionais). */
  dev?: {
    checkpoints(): string[];
    teleportTo(id: string): void;
    toggleColliders(): void;
    complete(stars: 1 | 2 | 3): void;
    collectAll(): void;
  };
}

export type RuntimeFactory = (host: LevelHost) => LevelRuntime;
