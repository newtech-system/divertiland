import type { CharacterId, DifficultyId, ItemSlot } from '../../core/types';

/** Versão atual do formato do save. Aumente e adicione uma migração em SaveSchema.ts. */
export const SAVE_VERSION = 1;

export interface LevelProgress {
  /** Concluída pelo menos uma vez. */
  completed: boolean;
  bestStars: number;
  /** Ids dos objetivos bônus já cumpridos alguma vez. */
  objectivesMet: string[];
  bestCoins: number;
  bestTimeSec: number | null;
  plays: number;
  completions: number;
  /** Estilos de aventura em que já concluiu. */
  completedDifficulties: DifficultyId[];
  secretsFound: string[];
  collectiblesFound: string[];
  firstRewardClaimed: boolean;
  threeStarRewardClaimed: boolean;
}

/** Progresso salvo no meio de uma fase (estado IN_PROGRESS). */
export interface InProgressRun {
  levelId: string;
  difficulty: DifficultyId;
  checkpointId: string | null;
  collectedIds: string[];
  secretsFound: string[];
  collectiblesFound: string[];
  elapsedSec: number;
  savedAt: number;
}

export interface ProfileData {
  id: string;
  name: string;
  character: CharacterId;
  createdAt: number;
  lastPlayedAt: number;
  preferredDifficulty: DifficultyId;
  divertis: number;
  totalEarned: number;
  levels: Record<string, LevelProgress>;
  inProgress: InProgressRun | null;
  /** Itens possuídos (os padrões são adicionados automaticamente). */
  inventory: string[];
  /** Itens vistos (para o selo "NOVO!" na loja). */
  seenItems: string[];
  /** Equipamento por personagem: trocar de personagem preserva o visual de cada um. */
  equipped: Record<CharacterId, Partial<Record<ItemSlot, string>>>;
  achievements: Record<string, number>;
  chestsOpened: string[];
  /** Segredos encontrados em qualquer fase (abre fases secretas). */
  secrets: string[];
  stats: Record<string, number>;
  tutorialsSeen: string[];
}

export interface SettingsData {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  narration: boolean;
  cameraSensitivity: number;
  invertCameraY: boolean;
  quality: 'low' | 'medium' | 'high';
  touchControls: 'auto' | 'on' | 'off';
  reducedMotion: boolean;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  activeProfileId: string | null;
  profiles: ProfileData[];
  settings: SettingsData;
  /** true quando a família apagou todos os perfis de propósito (não é perda de dados). */
  emptiedOnPurpose: boolean;
}
