import type { DifficultyId } from '../core/types';

/**
 * Os três Estilos de Aventura (seção 6).
 * A MESMA fase usa estes parâmetros para se adaptar — nada de três jogos separados.
 * Fases podem sobrescrever qualquer valor em `LevelData.difficultyOverrides`.
 */
export interface DifficultyParams {
  /** Multiplicador da velocidade do personagem. */
  playerSpeedMul: number;
  /** Multiplicador da velocidade de obstáculos móveis. */
  obstacleSpeedMul: number;
  /** Escala do tamanho de plataformas "de pulo". */
  platformScale: number;
  /** Raio (m) em que Divertis são atraídos pelo personagem. */
  coinMagnetRadius: number;
  /** 0 = sem dicas, 1 = placas/setas, 2 = trilha de brilhos + dicas extras. */
  hintLevel: 0 | 1 | 2;
  /** Multiplicador de tempo em desafios cronometrados (maior = mais tempo). */
  timeMul: number;
  /** Ativa checkpoints extras marcados como `onlyIn: ['sloth']` etc. */
  extraCheckpoints: boolean;
  /** Tolerância de pulo após sair da beirada (segundos). */
  coyoteTime: number;
  /** Atraso antes de voltar ao checkpoint (segundos). */
  respawnDelay: number;
  /** Multiplicador de força dos empurrões de obstáculos. */
  knockbackMul: number;
  /** Multiplicador de recompensa em Divertis. */
  rewardMul: number;
  /** Velocidade base do modo corrida (runner), em m/s. */
  runnerSpeed: number;
  /** Aceleração do runner ao longo da fase (m/s por segundo). */
  runnerAccel: number;
}

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  short: string;
  icon: string;
  color: string;
  description: string;
  params: DifficultyParams;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  sloth: {
    id: 'sloth',
    name: 'Bicho-Preguiça',
    short: 'Tranquilo',
    icon: '🦥',
    color: '#27c97a',
    description: 'Bem tranquilo, com muita ajuda.',
    params: {
      // Mesma velocidade: andar mais devagar deixaria os saltos MAIS difíceis.
      playerSpeedMul: 1.0,
      obstacleSpeedMul: 0.55,
      platformScale: 1.3,
      coinMagnetRadius: 2.4,
      hintLevel: 2,
      timeMul: 1.6,
      extraCheckpoints: true,
      coyoteTime: 0.22,
      respawnDelay: 0.35,
      knockbackMul: 0.6,
      rewardMul: 1.0,
      runnerSpeed: 8,
      runnerAccel: 0.05,
    },
  },
  monkey: {
    id: 'monkey',
    name: 'Macaco Aventureiro',
    short: 'Aventura',
    icon: '🐒',
    color: '#ff8a00',
    description: 'Do jeito certinho: pula, corre e explora!',
    params: {
      playerSpeedMul: 1.0,
      obstacleSpeedMul: 1.0,
      platformScale: 1.0,
      coinMagnetRadius: 1.3,
      hintLevel: 1,
      timeMul: 1.0,
      extraCheckpoints: false,
      coyoteTime: 0.14,
      respawnDelay: 0.45,
      knockbackMul: 1.0,
      rewardMul: 1.1,
      runnerSpeed: 11,
      runnerAccel: 0.12,
    },
  },
  jaguar: {
    id: 'jaguar',
    name: 'Jaguar',
    short: 'Rapidíssimo',
    icon: '🐆',
    color: '#ffc400',
    description: 'Rápido e desafiador, com rotas especiais!',
    params: {
      playerSpeedMul: 1.15,
      obstacleSpeedMul: 1.4,
      platformScale: 0.85,
      coinMagnetRadius: 0.9,
      hintLevel: 0,
      timeMul: 0.75,
      extraCheckpoints: false,
      coyoteTime: 0.1,
      respawnDelay: 0.5,
      knockbackMul: 1.25,
      rewardMul: 1.25,
      runnerSpeed: 14,
      runnerAccel: 0.2,
    },
  },
};

export function getDifficultyParams(
  id: DifficultyId,
  overrides?: Partial<Record<DifficultyId, Partial<DifficultyParams>>>,
): DifficultyParams {
  const base = (DIFFICULTIES[id] ?? DIFFICULTIES.monkey).params;
  return { ...base, ...(overrides?.[id] ?? {}) };
}
