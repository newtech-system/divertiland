import type { CharacterId, DifficultyId, LevelSize, LevelType, SkillFocus } from '../core/types';
import type { DifficultyParams } from './difficulty';
import type { LevelRewardConfig } from './economy';

/**
 * Objetivos bônus de estrela (seção 21).
 * ⭐ = concluir a fase. Cada objetivo bônus cumprido vale +1 estrela (máximo 3).
 * Como normalmente há 3 objetivos bônus para 2 estrelas extras, crianças diferentes
 * conseguem 3 estrelas de maneiras diferentes.
 */
export type ObjectiveDef =
  | { id: string; type: 'coinsRatio'; ratio: number; icon: string; label: string }
  | { id: string; type: 'secret'; secretId: string; icon: string; label: string }
  | { id: string; type: 'collectibles'; count: number; icon: string; label: string }
  | { id: string; type: 'timeUnder'; seconds: number; icon: string; label: string }
  /** Flag genérica definida pelo runtime da fase (ex.: "noHits", "noHints"). */
  | { id: string; type: 'flag'; flag: string; icon: string; label: string };

export interface UnlockRule {
  /** Fases que precisam estar concluídas. */
  afterLevels?: string[];
  /** Total mínimo de estrelas do perfil. */
  minStars?: number;
  /** Segredo que precisa ter sido descoberto (abre fases secretas). */
  secretId?: string;
}

export type MapNodeStyle = 'normal' | 'special' | 'bonus' | 'secret';

export interface LevelData {
  id: string;
  worldId: string;
  /** Ordem no caminho do mapa. */
  order: number;
  name: string;
  /** Uma frase curta mostrada no cartão da fase. */
  tagline: string;
  icon: string;
  type: LevelType;
  size: LevelSize;
  /** Habilidade trabalhada de forma invisível (seção 26). Uso interno/relatórios. */
  skillFocus: SkillFocus[];
  /** Mascote que guia a fase. */
  guide: CharacterId;
  unlock: UnlockRule;
  objectives: ObjectiveDef[];
  /** Sobrescreve a economia padrão do tamanho da fase. */
  rewards?: Partial<LevelRewardConfig>;
  /** Item ganho na primeira conclusão. */
  rewardItemOnComplete?: string;
  /** Item ganho na primeira vez com 3 estrelas. */
  rewardItemOnThreeStars?: string;
  difficultyOverrides?: Partial<Record<DifficultyId, Partial<DifficultyParams>>>;
  /** Id do conteúdo da fase (carregado sob demanda em levels/registry.ts). */
  contentId: string;
  /** false = aparece no mapa como "Em construção". */
  implemented: boolean;
  /** Posição no mapa (0–100 % horizontal, em "passos" verticais). */
  map: { x: number; y: number; style: MapNodeStyle };
}

export interface ChestDef {
  id: string;
  /** Estrelas necessárias (soma no mundo). */
  stars: number;
  divertis: number;
  itemId?: string;
  map: { x: number; y: number };
}

export interface WorldDef {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  colors: { primary: string; secondary: string; accent: string };
  musicId: string;
  levels: LevelData[];
  chests: ChestDef[];
}
