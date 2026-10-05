import type { DifficultyId } from '../../core/types';

/**
 * FASE 4 — PORTA MISTERIOSA (puzzle, desafio especial)
 * Três cadeados, três tipos de raciocínio (seção 13), sempre dentro da aventura:
 *  1) memória: repetir a sequência de luzes da porta
 *  2) formas: encaixar cada peça no buraco certo
 *  3) lógica: descobrir o que vem a seguir no padrão
 */
export type PuzzleStage =
  | { type: 'simon'; length: Record<DifficultyId, number>; intro: string }
  | { type: 'shapes'; count: Record<DifficultyId, number>; intro: string }
  | { type: 'pattern'; rounds: Record<DifficultyId, number>; intro: string };

export interface PuzzleData {
  id: string;
  intro: string;
  hints: Record<DifficultyId, number>;
  stages: PuzzleStage[];
}

export const PUZZLE_W1_L04: PuzzleData = {
  id: 'w1_l04',
  intro: 'Uma porta misteriosa! Ela tem três cadeados. Vamos descobrir como abrir?',
  hints: { sloth: Infinity, monkey: 3, jaguar: 1 },
  stages: [
    { type: 'simon', length: { sloth: 3, monkey: 4, jaguar: 5 }, intro: 'Cadeado da memória: olhe as luzes e toque na mesma ordem!' },
    { type: 'shapes', count: { sloth: 3, monkey: 4, jaguar: 5 }, intro: 'Cadeado das formas: toque numa peça e depois no buraco igual!' },
    { type: 'pattern', rounds: { sloth: 2, monkey: 3, jaguar: 4 }, intro: 'Cadeado do padrão: o que vem depois?' },
  ],
};

/** Cores/símbolos usados nos puzzles (símbolo ajuda quem não distingue cores). */
export const PUZZLE_COLORS = [
  { id: 'pink', color: '#ff3d9a', symbol: '★' },
  { id: 'yellow', color: '#ffd60a', symbol: '●' },
  { id: 'green', color: '#22c96d', symbol: '▲' },
  { id: 'cyan', color: '#21d4fd', symbol: '■' },
];

export const PUZZLE_SHAPES = [
  { id: 'star', symbol: '★', color: '#ffd60a' },
  { id: 'heart', symbol: '♥', color: '#ff3d6e' },
  { id: 'circle', symbol: '●', color: '#21d4fd' },
  { id: 'triangle', symbol: '▲', color: '#22c96d' },
  { id: 'square', symbol: '■', color: '#8b3cff' },
  { id: 'moon', symbol: '☾', color: '#ff8a00' },
];

/** Itens dos padrões (emoji grandes e claros). */
export const PATTERN_ITEMS = ['🎈', '⭐', '🍭', '🧸', '🍩', '🎁'];
