import type { DifficultyId } from '../../core/types';
import type { PropKind } from '../../engine/props/Props';

export type V3t = [number, number, number];

export interface Spot {
  pos: V3t;
  rotY?: number;
}

/** Objeto a ser encontrado. Tem várias posições possíveis: a cada partida, uma é sorteada. */
export interface HiddenTarget {
  id: string;
  name: string;
  icon: string;
  kind: PropKind;
  color: string;
  accent?: string;
  scale?: number;
  spots: Spot[];
}

export interface DecorProp {
  kind: PropKind;
  pos: V3t;
  rotY?: number;
  color?: string;
  accent?: string;
  scale?: number;
  /** Bloqueia o clique (esconde o que está atrás). Padrão: true. */
  occludes?: boolean;
}

/** FORMATO DE DADOS de uma fase de objetos escondidos (seção 12). */
export interface HiddenRoomData {
  id: string;
  music: string;
  intro: string;
  background: string;
  room: { radius: number; height: number; wallColors: string[]; floorColors: [string, string] };
  camera: { height: number };
  decor: DecorProp[];
  targets: HiddenTarget[];
  /** Quantos objetos procurar em cada estilo de aventura. */
  counts: Record<DifficultyId, number>;
  /** Dicas disponíveis (Infinity = ilimitado). */
  hints: Record<DifficultyId, number>;
  /** Colecionável bônus (ursinho dourado) com posições possíveis. */
  bonus: { id: string; spots: Spot[] };
  /** Moedas para tocar e coletar. */
  coins: V3t[];
  /** Mostrar cronômetro neste estilo. */
  showTimer: DifficultyId[];
}
