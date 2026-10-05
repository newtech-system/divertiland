import type { DifficultyId } from '../core/types';

/** O que um runtime de fase entrega ao terminar (qualquer tipo de gameplay). */
export interface LevelRunResult {
  levelId: string;
  difficulty: DifficultyId;
  completed: boolean;
  /** Quantidade de moedas (itens) coletadas e total existente na fase/dificuldade. */
  coinsCollected: number;
  coinsTotal: number;
  /** Soma em Divertis das moedas/gemas coletadas. */
  divertisCollected: number;
  secretsFound: string[];
  collectiblesFound: string[];
  timeSec: number;
  /** Flags definidas pelo runtime (ex.: "fewHits") para objetivos do tipo 'flag'. */
  flags: string[];
  /** Estatísticas somadas ao perfil (ex.: trampolineBounces, falls). */
  stats: Record<string, number>;
}

export interface RewardLine {
  icon: string;
  label: string;
  amount: number;
}

export interface LevelOutcome {
  levelId: string;
  stars: number;
  prevBestStars: number;
  /** Objetivos bônus cumpridos nesta partida. */
  objectivesMet: string[];
  isFirstCompletion: boolean;
  rewardLines: RewardLine[];
  totalDivertis: number;
  unlockedLevels: string[];
  itemsGranted: string[];
  achievements: string[];
  newBestTime: boolean;
  chestsReady: string[];
}
