import type { LevelSize } from '../core/types';

/**
 * ECONOMIA CENTRAL (seção 23).
 * Todos os números de Divertis do jogo vivem aqui — altere aqui para balancear.
 */
export interface LevelRewardConfig {
  /** Paga somente na PRIMEIRA vez que a fase é concluída. */
  firstCompletion: number;
  /** Paga ao concluir novamente (repetir fase vale a pena, mas sem "farm"). */
  replayCompletion: number;
}

export const ECONOMY = {
  /** Divertis com que um perfil novo começa. */
  startingDivertis: 30,

  /** Valor de cada moeda pequena coletada dentro das fases. */
  coinValue: 1,
  /** Valor de cada moeda grande (gema). */
  gemValue: 5,

  /** Recompensas por tamanho de fase. Uma fase pode sobrescrever em LevelData.rewards. */
  levelRewards: {
    short: { firstCompletion: 40, replayCompletion: 10 },
    normal: { firstCompletion: 70, replayCompletion: 15 },
    main: { firstCompletion: 120, replayCompletion: 25 },
    bonus: { firstCompletion: 250, replayCompletion: 50 },
  } as Record<LevelSize, LevelRewardConfig>,

  /** Bônus pago para cada estrela conquistada pela PRIMEIRA vez. */
  perNewStar: 15,
  /** Bônus extra ao alcançar 3 estrelas pela primeira vez. */
  threeStarBonus: 40,
  /** Bônus por segredo descoberto pela primeira vez. */
  secretBonus: 25,
  /** Bônus por colecionável (ex.: ursinho dourado) encontrado pela primeira vez. */
  collectibleBonus: 10,
  /** Bônus ao concluir num estilo de aventura pela primeira vez (incentiva rejogar no Jaguar). */
  newDifficultyBonus: 20,
} as const;
