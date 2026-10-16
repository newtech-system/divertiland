import { CHARACTER_IDS, DIFFICULTY_IDS, ITEM_SLOTS, type CharacterId, type DifficultyId } from '../../core/types';
import { isFiniteNumber, clamp } from '../../core/util';
import { createLogger } from '../../core/Logger';
import { ADVENTURES } from '../../data/adventures';
import {
  SAVE_VERSION,
  type AdventureProgress,
  type InProgressRun,
  type LedgerEntry,
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

export function defaultAdventureProgress(): AdventureProgress {
  return {
    completed: false,
    stagesDone: [],
    objectivesMet: [],
    goldens: [],
    completions: 0,
    completedDifficulties: [],
    secretsFound: [],
    bestTimeSec: null,
    bestCoins: 0,
    runIndex: 0,
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
    adventures: {},
    tokens: 0,
    grantedKeys: [],
    ledger: [],
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

function sanitizeAdventureProgress(v: unknown): AdventureProgress {
  const d = defaultAdventureProgress();
  if (!isObj(v)) return d;
  return {
    completed: bool(v.completed, d.completed),
    stagesDone: strArray(v.stagesDone),
    objectivesMet: strArray(v.objectivesMet),
    goldens: strArray(v.goldens),
    completions: int(v.completions, 0),
    completedDifficulties: strArray(v.completedDifficulties).filter((x): x is DifficultyId =>
      DIFFICULTY_IDS.includes(x as DifficultyId),
    ),
    secretsFound: strArray(v.secretsFound),
    bestTimeSec: isFiniteNumber(v.bestTimeSec) && v.bestTimeSec > 0 ? v.bestTimeSec : null,
    bestCoins: int(v.bestCoins, 0),
    runIndex: int(v.runIndex, 0, 0, 20),
  };
}

function sanitizeLedger(v: unknown): LedgerEntry[] {
  if (!Array.isArray(v)) return [];
  const out: LedgerEntry[] = [];
  for (const e of v.slice(-300)) {
    if (!isObj(e) || typeof e.key !== 'string') continue;
    out.push({
      key: e.key.slice(0, 120),
      kind: oneOf(e.kind, ['divertis', 'tokens', 'item', 'golden', 'star'] as const, 'divertis'),
      amount: int(e.amount, 0, -1e9, 1e9),
      reason: str(e.reason, 'recompensa', 80),
      at: int(e.at, Date.now(), 0, 1e15),
      // Qualquer lançamento sem marca explícita é tratado como simulação: nunca
      // transformar saldo antigo de teste em direito a prêmio real (B40, seção 18.6).
      simulated: bool(e.simulated, true),
    });
  }
  return out;
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
    // Estado da missão: sem isto, continuar a aventura perdia as etapas e as flags
    // (portões já abertos), o que podia prender a criança atrás de uma porta.
    stagesDone: strArray(v.stagesDone),
    questFlags: strArray(v.questFlags),
    questFriends: strArray(v.questFriends),
    questItemsTaken: strArray(v.questItemsTaken),
    questPadsLit: strArray(v.questPadsLit),
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
  if (isObj(v.adventures)) {
    for (const [aid, ap] of Object.entries(v.adventures)) {
      if (typeof aid === 'string' && aid.length < 40) p.adventures[aid] = sanitizeAdventureProgress(ap);
    }
  }
  p.tokens = int(v.tokens, 0, 0, 1e7);
  p.grantedKeys = Array.isArray(v.grantedKeys)
    ? [...new Set(v.grantedKeys.filter((x: unknown): x is string => typeof x === 'string' && x.length < 120))].slice(-4000)
    : [];
  p.ledger = sanitizeLedger(v.ledger);
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
const MIGRATIONS: Record<number, Migration> = {
  /**
   * v1 → v2: o jogo passou de dez fases pequenas para CINCO AVENTURAS (seção 24.4).
   *
   * Regras desta migração:
   *  - nada é apagado: `levels` continua guardando o histórico de cada fase/etapa;
   *  - uma aventura só vira "concluída" se TODAS as fases que a compõem já estavam
   *    concluídas — e já entra com a recompensa de primeira conclusão marcada como paga,
   *    para não pagar duas vezes (B39);
   *  - as estrelas antigas NÃO viram estrelas de aventura (os objetivos são outros);
   *    a criança ganha a estrela de conclusão e pode conquistar as outras duas jogando;
   *  - ursinhos dourados são traduzidos para o id PERMANENTE pela tabela de cada
   *    aventura, então quem já achou continua com ele;
   *  - Divertis antigos continuam valendo (é moeda de brincadeira); Pontos de Troca
   *    começam em zero — saldo local nunca comprova direito a prêmio real (B40).
   */
  1: (raw) => {
    const profiles = Array.isArray(raw.profiles) ? raw.profiles : [];
    for (const p of profiles) {
      if (!isObj(p)) continue;
      const levels: Record<string, any> = isObj(p.levels) ? p.levels : {};
      const advs: Record<string, any> = isObj(p.adventures) ? { ...p.adventures } : {};
      for (const adv of ADVENTURES) {
        const prev = isObj(advs[adv.id]) ? advs[adv.id] : null;
        const ap: Record<string, any> = prev ?? {
          completed: false,
          stagesDone: [],
          objectivesMet: [],
          goldens: [],
          completions: 0,
          completedDifficulties: [],
          secretsFound: [],
          bestTimeSec: null,
          bestCoins: 0,
          runIndex: 0,
        };
        const stagesDone = new Set<string>(Array.isArray(ap.stagesDone) ? ap.stagesDone : []);
        const goldens = new Set<string>(Array.isArray(ap.goldens) ? ap.goldens : []);
        const secrets = new Set<string>(Array.isArray(ap.secretsFound) ? ap.secretsFound : []);
        const diffs = new Set<string>(Array.isArray(ap.completedDifficulties) ? ap.completedDifficulties : []);
        let allDone = adv.runs.length > 0;
        for (const run of adv.runs) {
          const lp = levels[run.levelId];
          const done = isObj(lp) && lp.completed === true;
          if (done) for (const sid of run.stages) stagesDone.add(sid);
          else allDone = false;
          if (isObj(lp)) {
            for (const sec of Array.isArray(lp.secretsFound) ? lp.secretsFound : []) secrets.add(String(sec));
            for (const d of Array.isArray(lp.completedDifficulties) ? lp.completedDifficulties : []) diffs.add(String(d));
          }
        }
        // Ursinhos dourados: procura em TODAS as fases antigas, inclusive nas que foram
        // reconstruídas com outro id (a Fase 1 virou a Aventura 1). Quem já achou continua
        // com ele — e a chave do livro-caixa abaixo garante que não será pago de novo.
        for (const lp of Object.values(levels)) {
          if (!isObj(lp)) continue;
          for (const c of Array.isArray(lp.collectiblesFound) ? lp.collectiblesFound : []) {
            const g = adv.goldens.find((x) => x.from === c || x.legacyFrom?.includes(String(c)));
            if (g) goldens.add(g.id);
          }
        }
        ap.stagesDone = [...stagesDone];
        ap.goldens = [...goldens];
        ap.secretsFound = [...secrets];
        ap.completed = ap.completed === true || allDone;
        if (allDone) {
          ap.completions = Math.max(1, Number(ap.completions) || 0);
          ap.completedDifficulties = [...diffs];
          // Estrela da conclusão (as outras duas são conquistadas jogando).
          const met = new Set<string>(Array.isArray(ap.objectivesMet) ? ap.objectivesMet : []);
          met.add('completed');
          ap.objectivesMet = [...met];
        }
        advs[adv.id] = ap;
      }
      p.adventures = advs;
      p.tokens = 0;
      // Chaves já concedidas: marca a primeira conclusão das aventuras migradas como
      // paga, para a migração nunca pagar de novo (nem se rodar duas vezes).
      const keys = new Set<string>(Array.isArray(p.grantedKeys) ? p.grantedKeys.filter((k: unknown) => typeof k === 'string') : []);
      for (const adv of ADVENTURES) {
        const ap = advs[adv.id];
        if (!ap) continue;
        // Tudo que a criança JÁ tinha entra como "já pago": o jogo antigo já deu os
        // Divertis desses ursinhos e segredos. Vale mesmo que a aventura não esteja
        // concluída — senão a primeira conclusão pagaria tudo de novo.
        for (const g of ap.goldens ?? []) keys.add(`${p.id}:${adv.id}:dourado:${g}`);
        for (const s of ap.secretsFound ?? []) keys.add(`${p.id}:${adv.id}:segredo:${s}`);
        if (ap.completed) keys.add(`${p.id}:${adv.id}:primeira`);
      }
      p.grantedKeys = [...keys];
      if (!Array.isArray(p.ledger)) p.ledger = [];
    }
    return { ...raw, version: 2, profiles };
  },
};

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
