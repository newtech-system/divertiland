import { createLogger } from '../core/Logger';
import { Exploration3DLevel } from './exploration/Exploration3DLevel';
import { HiddenObjectsLevel } from './hidden/HiddenObjectsLevel';
import { RunnerLevel } from './runner/RunnerLevel';
import { PuzzleLevel } from './puzzle/PuzzleLevel';
import type { LevelHost, LevelRuntime } from './LevelRuntime';

const log = createLogger('LevelRegistry');

/**
 * Liga o `contentId` de cada fase (data/worlds.ts) ao seu runtime + conteúdo.
 * Os dados de cada fase são carregados sob demanda (import dinâmico = carregamento por fase).
 * Para adicionar uma fase nova de um tipo já existente, basta criar o arquivo de dados
 * e uma linha aqui.
 */
const CONTENT: Record<string, (host: LevelHost) => LevelRuntime> = {
  w1_l01: (host) => new Exploration3DLevel(host, () => import('../data/levels/w1_l01').then((m) => m.LEVEL_W1_L01)),
  w1_l02: (host) => new HiddenObjectsLevel(host, () => import('../data/levels/w1_l02').then((m) => m.HIDDEN_W1_L02)),
  w1_l03: (host) => new RunnerLevel(host),
  w1_l04: (host) => new PuzzleLevel(host),
  w1_l05: (host) => new Exploration3DLevel(host, () => import('../data/levels/w1_l05').then((m) => m.LEVEL_W1_L05)),
  w1_l06: (host) => new Exploration3DLevel(host, () => import('../data/levels/w1_l06').then((m) => m.LEVEL_W1_L06)),
  w1_l07: (host) => new Exploration3DLevel(host, () => import('../data/levels/w1_l07').then((m) => m.LEVEL_W1_L07)),
  w1_l09: (host) => new Exploration3DLevel(host, () => import('../data/levels/w1_l09').then((m) => m.LEVEL_W1_L09)),
  w1_l10: (host) => new Exploration3DLevel(host, () => import('../data/levels/w1_l10').then((m) => m.LEVEL_W1_L10)),
  w1_s01: (host) => new Exploration3DLevel(host, () => import('../data/levels/w1_s01').then((m) => m.LEVEL_W1_S01)),
  w1_l08: (host) => new Exploration3DLevel(host, () => import('../data/levels/w1_l08').then((m) => m.LEVEL_W1_L08)),
};

export function hasContent(contentId: string): boolean {
  return contentId in CONTENT;
}

export function createRuntime(contentId: string, host: LevelHost): LevelRuntime | null {
  const f = CONTENT[contentId];
  if (!f) {
    log.warn(`Fase sem conteúdo ainda: ${contentId}`);
    return null;
  }
  return f(host);
}
