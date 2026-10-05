import { CHARACTER_IDS, DIFFICULTY_IDS, ITEM_SLOTS, type CharacterId, type DifficultyId } from '../../core/types';
import { isFiniteNumber, clamp } from '../../core/util';
import { createLogger } from '../../core/Logger';
import {
  SAVE_VERSION,
  type InProgressRun,
  type LevelProgress,
  type ProfileData,
  type SaveData,
  type SettingsData,
} from './SaveTypes';

const log = createLogger('SaveSchema');

/**
 * Validação e "conserto" do save (seção 49).
 * Regra de ouro: qualquer campo inválido vira o valor padrão — NUNCA joga fora o save inteiro
 * por causa de um campo ruim.
 */

export function defaultSettings(): SettingsData {
  return {
    masterVolume: 0.8,
    musicVolume: 0.5,
    sfxVolume: 0.9,
    narration: true,
    cameraSensitivity: 1,
    invertCameraY: false,
    quality: 'medium',
    touchControls: 'auto',
    reducedMotion: false,
  };
}

export function defaultSave(): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    activeProfileId: null,
    profiles: [],
    settings: defaultSettings(),
    emptiedOnPurpose: false,
  };
}

export function defaultLevelProgress(): LevelProgress {
  return {
    completed: false,
    bestStars: 0,
    objectivesMet: [],
    bestCoins: 0,
    bestTimeSec: null,
    plays: 0,
    completions: 0,
    completedDifficulties: [],
    secretsFound: [],
    collectiblesFound: [],
    firstRewardClaimed: false,
    threeStarRewardClaimed: false,
  };
}

export function createProfile(
  id: string,
  name: string,
  character: CharacterId,
  difficulty: DifficultyId,
  startingDivertis: number,
): ProfileData {
  const now = Date.now();
  return {
    id,
    name,
    character,
    createdAt: now,
    lastPlayedAt: now,
    preferredDifficulty: difficulty,
    divertis: startingDivertis,
    totalEarned: 0,
    levels: {},
    inProgress: null,
    inventory: [],
    seenItems: [],
    equipped: { jhow: {}, mina: {} },
    achievements: {},
    chestsOpened: [],
    secrets: [],
    stats: {},
    tutorialsSeen: [],
  };
}

// ---------- helpers de saneamento ----------

const str = (v: unknown, fallback: string, maxLen = 40) =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, maxLen) : fallback;
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) =>
  isFiniteNumber(v) ? clamp(v, min, max) : fallback;
const int = (v: unknown, fallback: number, min = 0, max = 1e9) => Math.round(num(v, fallback, min, max));
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const strArray = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length < 80))] : [];
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;
const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);

function sanitizeLevelProgress(v: unknown): LevelProgress {
  const d = defaultLevelProgress();
  if (!isObj(v)) return d;
  return {
    completed: bool(v.completed, d.completed),
    bestStars: int(v.bestStars, 0, 0, 3),
    objectivesMet: strArray(v.objectivesMet),
    bestCoins: int(v.bestCoins, 0),
    bestTimeSec: isFiniteNumber(v.bestTimeSec) && v.bestTimeSec > 0 ? v.bestTimeSec : null,
    plays: int(v.plays, 0),
    completions: int(v.completions, 0),
    completedDifficulties: strArray(v.completedDifficulties).filter((x): x is DifficultyId =>
      DIFFICULTY_IDS.includes(x as DifficultyId),
    ),
    secretsFound: strArray(v.secretsFound),
    collectiblesFound: strArray(v.collectiblesFound),
    firstRewardClaimed: bool(v.firstRewardClaimed, false),
    threeStarRewardClaimed: bool(v.threeStarRewardClaimed, false),
  };
}

function sanitizeInProgress(v: unknown): InProgressRun | null {
  if (!isObj(v) || typeof v.levelId !== 'string') return null;
  return {
    levelId: v.levelId,
    difficulty: oneOf(v.difficulty, DIFFICULTY_IDS, 'monkey'),
    checkpointId: typeof v.checkpointId === 'string' ? v.checkpointId : null,
    collectedIds: strArray(v.collectedIds),
    secretsFound: strArray(v.secretsFound),
    collectiblesFound: strArray(v.collectiblesFound),
    elapsedSec: num(v.elapsedSec, 0, 0, 1e6),
    savedAt: int(v.savedAt, Date.now(), 0, 1e15),
  };
}

export function sanitizeProfile(v: unknown, index: number): ProfileData | null {
  if (!isObj(v)) return null;
  const id = str(v.id, `profile_recovered_${index}`, 60);
  const p = createProfile(
    id,
    str(v.name, 'Explorador', 20),
    oneOf(v.character, CHARACTER_IDS, 'jhow'),
    oneOf(v.preferredDifficulty, DIFFICULTY_IDS, 'monkey'),
    0,
  );
  p.createdAt = int(v.createdAt, Date.now(), 0, 1e15);
  p.lastPlayedAt = int(v.lastPlayedAt, p.createdAt, 0, 1e15);
  p.divertis = int(v.divertis, 0);
  p.totalEarned = int(v.totalEarned, p.divertis);
  if (isObj(v.levels)) {
    for (const [lid, lp] of Object.entries(v.levels)) {
      if (typeof lid === 'string' && lid.length < 60) p.levels[lid] = sanitizeLevelProgress(lp);
    }
  }
  p.inProgress = sanitizeInProgress(v.inProgress);
  p.inventory = strArray(v.inventory);
  p.seenItems = strArray(v.seenItems);
  for (const c of CHARACTER_IDS) {
    const src = isObj(v.equipped) && isObj(v.equipped[c]) ? v.equipped[c] : {};
    const eq: Partial<Record<string, string>> = {};
    for (const slot of ITEM_SLOTS) {
      if (typeof src[slot] === 'string') eq[slot] = src[slot];
    }
    p.equipped[c] = eq;
  }
  if (isObj(v.achievements)) {
    for (const [aid, t] of Object.entries(v.achievements)) {
      if (isFiniteNumber(t)) p.achievements[aid] = t;
    }
  }
  p.chestsOpened = strArray(v.chestsOpened);
  p.secrets = strArray(v.secrets);
  if (isObj(v.stats)) {
    for (const [k, s] of Object.entries(v.stats)) {
      if (isFiniteNumber(s)) p.stats[k] = s;
    }
  }
  p.tutorialsSeen = strArray(v.tutorialsSeen);
  return p;
}

export function sanitizeSettings(v: unknown): SettingsData {
  const d = defaultSettings();
  if (!isObj(v)) return d;
  return {
    masterVolume: num(v.masterVolume, d.masterVolume, 0, 1),
    musicVolume: num(v.musicVolume, d.musicVolume, 0, 1),
    sfxVolume: num(v.sfxVolume, d.sfxVolume, 0, 1),
    narration: bool(v.narration, d.narration),
    cameraSensitivity: num(v.cameraSensitivity, d.cameraSensitivity, 0.3, 2.5),
    invertCameraY: bool(v.invertCameraY, d.invertCameraY),
    quality: oneOf(v.quality, ['low', 'medium', 'high'] as const, d.quality),
    touchControls: oneOf(v.touchControls, ['auto', 'on', 'off'] as const, d.touchControls),
    reducedMotion: bool(v.reducedMotion, d.reducedMotion),
  };
}

export function sanitizeSave(v: unknown): SaveData {
  if (!isObj(v)) return defaultSave();
  const d = defaultSave();
  const profiles: ProfileData[] = [];
  const seen = new Set<string>();
  if (Array.isArray(v.profiles)) {
    v.profiles.forEach((raw, i) => {
      const p = sanitizeProfile(raw, i);
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        profiles.push(p);
      }
    });
  }
  const active = typeof v.activeProfileId === 'string' && seen.has(v.activeProfileId) ? v.activeProfileId : null;
  return {
    version: SAVE_VERSION,
    createdAt: int(v.createdAt, d.createdAt, 0, 1e15),
    updatedAt: int(v.updatedAt, d.updatedAt, 0, 1e15),
    activeProfileId: active,
    profiles,
    settings: sanitizeSettings(v.settings),
    emptiedOnPurpose: bool(v.emptiedOnPurpose, false),
  };
}

// ---------- migrações ----------

type Migration = (raw: Record<string, any>) => Record<string, any>;

/**
 * Migrações por versão: MIGRATIONS[n] transforma um save da versão n para n+1.
 * Exemplo futuro: MIGRATIONS[1] = (raw) => ({ ...raw, version: 2, novoCampo: ... })
 */
const MIGRATIONS: Record<number, Migration> = {};

export function migrate(raw: unknown): SaveData {
  if (!isObj(raw)) return defaultSave();
  let data: Record<string, any> = raw;
  let version = isFiniteNumber(data.version) ? Math.floor(data.version) : 0;
  if (version > SAVE_VERSION) {
    // Save de uma versão mais nova do jogo: tenta aproveitar o que der, sem apagar nada.
    log.warn(`Save da versão ${version} é mais novo que o jogo (${SAVE_VERSION}). Lendo em modo compatível.`);
  }
  while (version < SAVE_VERSION) {
    const m = MIGRATIONS[version];
    if (m) {
      log.info(`Migrando save v${version} → v${version + 1}`);
      data = m(data);
    }
    version += 1;
  }
  return sanitizeSave(data);
}
