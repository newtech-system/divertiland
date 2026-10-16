import type { CharacterId, DifficultyId, ItemSlot } from '../../core/types';

/** Versão atual do formato do save. Aumente e adicione uma migração em SaveSchema.ts. */
export const SAVE_VERSION = 2;

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

/**
 * Progresso de uma AVENTURA (seção 8 do V2). É aqui que vivem as coisas permanentes:
 * etapas internas concluídas, objetivos de estrela cumpridos e ursinhos dourados.
 *
 * As estrelas são guardadas como CONJUNTO de objetivos cumpridos, nunca como número
 * somado — melhorar de 1 para 3 estrelas acrescenta 2 ao total, e repetir não soma nada
 * (seção 17.2).
 */
export interface AdventureProgress {
  /** Concluída pelo menos uma vez. */
  completed: boolean;
  /** Etapas internas já concluídas (ids estáveis). */
  stagesDone: string[];
  /** Ids dos objetivos de estrela já cumpridos alguma vez (a conclusão conta como um). */
  objectivesMet: string[];
  /** Ursinhos dourados encontrados, por id PERMANENTE. */
  goldens: string[];
  completions: number;
  completedDifficulties: DifficultyId[];
  secretsFound: string[];
  bestTimeSec: number | null;
  bestCoins: number;
  /** Jogada atual dentro da aventura (0 = primeira), para retomar de onde parou. */
  runIndex: number;
}

/**
 * Lançamento no livro-caixa de recompensas (seção 19.2).
 * Toda recompensa FINITA passa por aqui com uma chave estável: repetir o pedido
 * (clique duplo, duas abas, falha de rede) devolve o que já existe e não credita de novo.
 */
export interface LedgerEntry {
  /** Chave de idempotência: perfil + campanha + aventura + objetivo. */
  key: string;
  kind: 'divertis' | 'tokens' | 'item' | 'golden' | 'star';
  amount: number;
  reason: string;
  at: number;
  /** true = ambiente de simulação; NUNCA vale como direito a prêmio real (seção 18.6). */
  simulated: boolean;
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
  /**
   * ETAPAS INTERNAS já concluídas nesta partida (seção 8). Sem isto, continuar uma
   * aventura apagava as etapas e a criança refazia a história desde o começo.
   */
  stagesDone?: string[];
  /**
   * Flags de missão ligadas (entrega feita, portão aberto). Sem isto, continuar podia
   * deixar a criança do lado errado de um portão que ela já tinha aberto.
   */
  questFlags?: string[];
  /** Estado de cada amigo, no formato "id:estado:fase". */
  questFriends?: string[];
  /** Objetos de missão já pegos (não voltam ao lugar ao continuar). */
  questItemsTaken?: string[];
  /** Botões de chão já acesos. */
  questPadsLit?: string[];
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
  /** Progresso das cinco aventuras (o que vale para estrelas, coleção e recompensas). */
  adventures: Record<string, AdventureProgress>;
  /**
   * Pontos de Troca Divertiland (seção 18.1): saldo SEPARADO dos Divertis, para escolher
   * brindes presenciais. Hoje existe apenas em **simulação** — nenhum resgate real.
   */
  tokens: number;
  /** Chaves de recompensa já concedidas (idempotência, seção 19.2). */
  grantedKeys: string[];
  /** Histórico de lançamentos (últimos 300). */
  ledger: LedgerEntry[];
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
