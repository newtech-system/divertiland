import type { DifficultyParams } from '../data/difficulty';
import type { LevelData, ObjectiveDef } from '../data/levelTypes';
import type { LevelRunResult } from './LevelResult';

export const MAX_STARS = 3;

/**
 * Estrelas (seção 21): ⭐ por concluir + 1 por objetivo bônus cumprido, até 3.
 * Não depende só de velocidade: moedas, segredos, colecionáveis e flags contam igual.
 */
export class StarManager {
  static isObjectiveMet(obj: ObjectiveDef, r: LevelRunResult, params?: DifficultyParams): boolean {
    switch (obj.type) {
      case 'coinsRatio':
        return r.coinsTotal > 0 && r.coinsCollected / r.coinsTotal >= obj.ratio - 1e-9;
      case 'secret':
        return r.secretsFound.includes(obj.secretId);
      case 'collectibles':
        return r.collectiblesFound.length >= obj.count;
      case 'timeUnder':
        return r.timeSec <= obj.seconds * (params?.timeMul ?? 1);
      case 'flag':
        return r.flags.includes(obj.flag);
      default:
        return false;
    }
  }

  static evaluate(level: LevelData, r: LevelRunResult, params?: DifficultyParams) {
    if (!r.completed) return { stars: 0, met: [] as string[] };
    const met = level.objectives.filter((o) => StarManager.isObjectiveMet(o, r, params)).map((o) => o.id);
    return { stars: Math.min(MAX_STARS, 1 + met.length), met };
  }
}
