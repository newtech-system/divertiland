import type { CharacterId, ItemSlot, ShopCategory } from '../core/types';

/**
 * Descrição visual de um item. O construtor do personagem (engine/character) sabe desenhar
 * cada `kind` com geometria placeholder; quando houver modelos finais, basta adicionar
 * `modelUrl` e o mesmo item passa a usar o arquivo 3D.
 */
export interface ItemVisual {
  kind:
    | 'fur'
    | 'hoodie'
    | 'tshirt'
    | 'dress'
    | 'shorts'
    | 'skirt'
    | 'sneakers'
    | 'headphones'
    | 'cap'
    | 'visor'
    | 'crown'
    | 'beanie'
    | 'partyHat'
    | 'glasses'
    | 'starGlasses'
    | 'heartGlasses'
    | 'backpack'
    | 'wings'
    | 'cape'
    | 'trail';
  colors: string[];
  modelUrl?: string;
}

/** Como o item é obtido (seção 24). Nada de loot boxes. */
export type ItemAcquire =
  | { type: 'default' }
  | { type: 'shop' }
  | { type: 'levelReward'; levelId: string }
  | { type: 'chest'; chestId: string }
  | { type: 'achievement'; achievementId: string }
  | { type: 'secret'; hint: string };

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  slot: ItemSlot;
  category: ShopCategory;
  price: number;
  acquire: ItemAcquire;
  visual: ItemVisual;
  /** Se definido, só esses personagens podem usar. */
  characters?: CharacterId[];
  /** Agrupa itens em coleções (aba COLEÇÕES). */
  collection?: string;
  /** Item escondido na loja até ser desbloqueado (itens secretos). */
  hidden?: boolean;
}

export interface CollectionDef {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const COLLECTIONS: CollectionDef[] = [
  { id: 'neon', name: 'Coleção Neon', icon: '💜', description: 'Brilha igual às luzes da Divertiland!' },
  { id: 'explorer', name: 'Coleção Explorador', icon: '🧭', description: 'Para quem ama descobrir segredos.' },
  { id: 'party', name: 'Coleção Festa', icon: '🎉', description: 'Pronto para comemorar!' },
];

const D = { type: 'default' } as const;
const S = { type: 'shop' } as const;

export const ITEMS: ItemDef[] = [
  // ---------- Itens padrão (sempre possuídos) ----------
  { id: 'skin_orange', name: 'Pelagem Laranja', icon: '🐻', slot: 'skin', category: 'special', price: 0, acquire: D, visual: { kind: 'fur', colors: ['#ff8a1f', '#ffd2a1'] } },
  { id: 'top_jhow_hoodie', name: 'Moletom do Jhow', icon: '🧥', slot: 'top', category: 'clothes', price: 0, acquire: D, characters: ['jhow'], visual: { kind: 'hoodie', colors: ['#2e8cff', '#2fe0a0', '#8b3cff', '#ffffff'] } },
  { id: 'bottom_cargo_black', name: 'Shorts Cargo', icon: '🩳', slot: 'bottom', category: 'clothes', price: 0, acquire: D, visual: { kind: 'shorts', colors: ['#24242c'] } },
  { id: 'feet_turquoise', name: 'Tênis Turquesa', icon: '👟', slot: 'feet', category: 'clothes', price: 0, acquire: D, visual: { kind: 'sneakers', colors: ['#1fd6c9', '#ffffff'] } },
  { id: 'ears_headphones_black', name: 'Headphone Preto', icon: '🎧', slot: 'ears', category: 'accessories', price: 0, acquire: D, visual: { kind: 'headphones', colors: ['#1d1d24', '#8b3cff'] } },
  { id: 'top_mina_outfit', name: 'Roupa da Mina', icon: '👚', slot: 'top', category: 'clothes', price: 0, acquire: D, characters: ['mina'], visual: { kind: 'hoodie', colors: ['#ff4fae', '#a14dff', '#ffd1ec', '#ffffff'] } },
  { id: 'bottom_mina_skirt', name: 'Saia Roxa', icon: '👗', slot: 'bottom', category: 'clothes', price: 0, acquire: D, visual: { kind: 'skirt', colors: ['#8b3cff'] } },
  { id: 'feet_pink', name: 'Tênis Rosa', icon: '👟', slot: 'feet', category: 'clothes', price: 0, acquire: D, visual: { kind: 'sneakers', colors: ['#ff5cb8', '#ffffff'] } },
  { id: 'head_visor_white', name: 'Viseira Branca', icon: '🧢', slot: 'head', category: 'accessories', price: 0, acquire: D, visual: { kind: 'visor', colors: ['#ffffff', '#ff4fae'] } },

  // ---------- ROUPAS ----------
  { id: 'top_tee_divertiland', name: 'Camiseta Divertiland', icon: '👕', slot: 'top', category: 'clothes', price: 40, acquire: S, visual: { kind: 'tshirt', colors: ['#ffffff', '#8b3cff'] } },
  { id: 'top_hoodie_neon', name: 'Moletom Neon', icon: '🧥', slot: 'top', category: 'clothes', price: 120, acquire: S, collection: 'neon', visual: { kind: 'hoodie', colors: ['#c13cff', '#ff3d9a', '#39ff88', '#ffffff'] } },
  { id: 'top_hoodie_sunset', name: 'Moletom Pôr do Sol', icon: '🌅', slot: 'top', category: 'clothes', price: 90, acquire: S, visual: { kind: 'hoodie', colors: ['#ffb000', '#ff4f6d', '#7a2cff', '#ffffff'] } },
  { id: 'top_tee_explorer', name: 'Camiseta Explorador', icon: '👕', slot: 'top', category: 'clothes', price: 60, acquire: S, collection: 'explorer', visual: { kind: 'tshirt', colors: ['#9bd35a', '#4a7a1f'] } },
  { id: 'bottom_shorts_jeans', name: 'Shorts Jeans', icon: '🩳', slot: 'bottom', category: 'clothes', price: 35, acquire: S, visual: { kind: 'shorts', colors: ['#3f6fd8'] } },
  { id: 'bottom_skirt_neon', name: 'Saia Neon', icon: '👗', slot: 'bottom', category: 'clothes', price: 70, acquire: S, collection: 'neon', visual: { kind: 'skirt', colors: ['#39ff88'] } },
  { id: 'bottom_shorts_explorer', name: 'Bermuda Explorador', icon: '🩳', slot: 'bottom', category: 'clothes', price: 50, acquire: S, collection: 'explorer', visual: { kind: 'shorts', colors: ['#c99a5b'] } },
  { id: 'feet_neon', name: 'Tênis Neon', icon: '👟', slot: 'feet', category: 'clothes', price: 80, acquire: S, collection: 'neon', visual: { kind: 'sneakers', colors: ['#39ff88', '#c13cff'] } },
  { id: 'feet_yellow', name: 'Tênis Amarelo', icon: '👟', slot: 'feet', category: 'clothes', price: 45, acquire: S, visual: { kind: 'sneakers', colors: ['#ffd60a', '#ffffff'] } },
  { id: 'feet_explorer', name: 'Bota Explorador', icon: '🥾', slot: 'feet', category: 'clothes', price: 55, acquire: S, collection: 'explorer', visual: { kind: 'sneakers', colors: ['#7a4b26', '#e7c08a'] } },

  // ---------- ACESSÓRIOS ----------
  { id: 'face_glasses_star', name: 'Óculos Estrela', icon: '🕶️', slot: 'face', category: 'accessories', price: 60, acquire: S, collection: 'party', visual: { kind: 'starGlasses', colors: ['#ffd60a', '#ff3d9a'] } },
  { id: 'face_glasses_neon', name: 'Óculos Neon', icon: '😎', slot: 'face', category: 'accessories', price: 75, acquire: S, collection: 'neon', visual: { kind: 'glasses', colors: ['#c13cff', '#39ffe0'] } },
  { id: 'face_glasses_heart', name: 'Óculos Coração', icon: '😍', slot: 'face', category: 'accessories', price: 65, acquire: S, visual: { kind: 'heartGlasses', colors: ['#ff3d6e', '#ffffff'] } },
  { id: 'head_cap_purple', name: 'Boné Roxo', icon: '🧢', slot: 'head', category: 'accessories', price: 50, acquire: S, visual: { kind: 'cap', colors: ['#8b3cff', '#ffd60a'] } },
  { id: 'head_cap_explorer', name: 'Chapéu Explorador', icon: '🤠', slot: 'head', category: 'accessories', price: 85, acquire: S, collection: 'explorer', visual: { kind: 'cap', colors: ['#c99a5b', '#7a4b26'] } },
  { id: 'head_beanie', name: 'Gorro Listrado', icon: '🧶', slot: 'head', category: 'accessories', price: 45, acquire: S, visual: { kind: 'beanie', colors: ['#ff8a00', '#ffffff'] } },
  { id: 'head_party', name: 'Chapéu de Festa', icon: '🥳', slot: 'head', category: 'accessories', price: 55, acquire: S, collection: 'party', visual: { kind: 'partyHat', colors: ['#ff3d9a', '#ffd60a'] } },
  { id: 'ears_headphones_neon', name: 'Headphone Neon', icon: '🎧', slot: 'ears', category: 'accessories', price: 90, acquire: S, collection: 'neon', visual: { kind: 'headphones', colors: ['#39ff88', '#c13cff'] } },
  { id: 'ears_headphones_pink', name: 'Headphone Rosa', icon: '🎧', slot: 'ears', category: 'accessories', price: 70, acquire: S, visual: { kind: 'headphones', colors: ['#ff5cb8', '#ffffff'] } },
  { id: 'back_backpack', name: 'Mochila Divertiland', icon: '🎒', slot: 'back', category: 'accessories', price: 100, acquire: S, collection: 'explorer', visual: { kind: 'backpack', colors: ['#ff8a00', '#8b3cff'] } },
  { id: 'back_backpack_pink', name: 'Mochila Rosa', icon: '🎒', slot: 'back', category: 'accessories', price: 80, acquire: S, visual: { kind: 'backpack', colors: ['#ff5cb8', '#ffd60a'] } },

  // ---------- ESPECIAIS ----------
  { id: 'effect_trail_stars', name: 'Rastro de Estrelas', icon: '✨', slot: 'effect', category: 'special', price: 150, acquire: S, collection: 'party', visual: { kind: 'trail', colors: ['#ffd60a', '#ffffff'] } },
  { id: 'effect_trail_neon', name: 'Rastro Neon', icon: '🌈', slot: 'effect', category: 'special', price: 180, acquire: S, collection: 'neon', visual: { kind: 'trail', colors: ['#c13cff', '#39ff88', '#ff3d9a'] } },
  { id: 'back_cape_hero', name: 'Capa de Herói', icon: '🦸', slot: 'back', category: 'special', price: 160, acquire: S, visual: { kind: 'cape', colors: ['#ff3d6e', '#ffd60a'] } },
  { id: 'skin_golden', name: 'Pelagem Dourada', icon: '🌟', slot: 'skin', category: 'special', price: 0, acquire: { type: 'chest', chestId: 'w1_chest_3' }, visual: { kind: 'fur', colors: ['#ffc928', '#fff1b8'] } },

  // ---------- Recompensas (não compráveis) ----------
  { id: 'head_crown', name: 'Coroa Divertiland', icon: '👑', slot: 'head', category: 'special', price: 0, acquire: { type: 'levelReward', levelId: 'w1_l01' }, collection: 'party', visual: { kind: 'crown', colors: ['#ffd60a', '#ff3d9a'] } },
  { id: 'back_wings', name: 'Asas de Trampolim', icon: '🪽', slot: 'back', category: 'special', price: 0, acquire: { type: 'chest', chestId: 'w1_chest_2' }, visual: { kind: 'wings', colors: ['#ffffff', '#9fe8ff'] } },
  { id: 'top_tee_gold', name: 'Camiseta Dourada', icon: '🏅', slot: 'top', category: 'special', price: 0, acquire: { type: 'chest', chestId: 'w1_chest_1' }, visual: { kind: 'tshirt', colors: ['#ffc928', '#ff8a00'] } },
  { id: 'face_glasses_secret', name: 'Óculos Secreto', icon: '🥸', slot: 'face', category: 'special', price: 0, hidden: true, acquire: { type: 'secret', hint: 'Escondido em algum segredo...' }, visual: { kind: 'glasses', colors: ['#111111', '#ffd60a'] } },
];

const byId = new Map(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef | undefined {
  return byId.get(id);
}

export function itemFitsCharacter(item: ItemDef, character: CharacterId): boolean {
  return !item.characters || item.characters.includes(character);
}
