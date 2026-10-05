// Tipos compartilhados por todo o jogo. Mantidos livres de dependências (sem DOM / three.js)
// para que os sistemas de regras possam ser testados automaticamente.

export type DifficultyId = 'sloth' | 'monkey' | 'jaguar';
export const DIFFICULTY_IDS: DifficultyId[] = ['sloth', 'monkey', 'jaguar'];

export type CharacterId = 'jhow' | 'mina';
export const CHARACTER_IDS: CharacterId[] = ['jhow', 'mina'];

/** Estados de uma fase no mapa (seção 42 do documento). */
export type LevelState = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

/** Tipos de gameplay (seções 9–19). Cada tipo tem um "runtime" próprio. */
export type LevelType =
  | 'exploration3D'
  | 'runner'
  | 'parkour'
  | 'hiddenObjects'
  | 'puzzle'
  | 'platformer2D'
  | 'floorIsLava'
  | 'narrative'
  | 'tasks'
  | 'trampoline'
  | 'hideAndSeek'
  | 'bonusMix';

/** Duração/peso da fase — usado pela economia (seção 20 e 23). */
export type LevelSize = 'short' | 'normal' | 'main' | 'bonus';

/** Habilidade trabalhada de forma invisível (seção 26). */
export type SkillFocus =
  | 'observation'
  | 'memory'
  | 'coordination'
  | 'planning'
  | 'persistence'
  | 'logic'
  | 'spatial_awareness'
  | 'decision_making'
  | 'creativity'
  | 'attention'
  | 'empathy';

export type ItemSlot =
  | 'head'
  | 'face'
  | 'ears'
  | 'back'
  | 'top'
  | 'bottom'
  | 'feet'
  | 'effect'
  | 'skin';

export const ITEM_SLOTS: ItemSlot[] = ['head', 'face', 'ears', 'back', 'top', 'bottom', 'feet', 'effect', 'skin'];

/** Slots que nunca podem ficar vazios (voltam ao item padrão do personagem). */
export const REQUIRED_SLOTS: ItemSlot[] = ['top', 'bottom', 'feet', 'skin'];

export type ShopCategory = 'clothes' | 'accessories' | 'special' | 'collections';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}
