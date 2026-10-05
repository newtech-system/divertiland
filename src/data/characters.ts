import type { CharacterId, ItemSlot } from '../core/types';

/**
 * Personagens jogáveis. Novos personagens entram aqui + itens padrão em items.ts.
 * `modelUrl` ficará preenchido quando os modelos finais (GLB com rig único) existirem;
 * enquanto isso o jogo usa o boneco placeholder procedural.
 */
export interface CharacterDef {
  id: CharacterId;
  name: string;
  pronoun: 'ele' | 'ela';
  tagline: string;
  /** Itens equipados por padrão (sempre possuídos). */
  defaultLook: Partial<Record<ItemSlot, string>>;
  /** Cor de destaque na interface. */
  uiColor: string;
  modelUrl?: string;
  /** Frases do mascote (feedback positivo, seção 27). */
  lines: {
    welcome: string[];
    cheer: string[];
    almost: string[];
    secret: string[];
    finish: string[];
  };
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  jhow: {
    id: 'jhow',
    name: 'Jhow',
    pronoun: 'ele',
    tagline: 'Aventureiro e brincalhão!',
    uiColor: '#1fb5d6',
    defaultLook: {
      skin: 'skin_orange',
      top: 'top_jhow_hoodie',
      bottom: 'bottom_cargo_black',
      feet: 'feet_turquoise',
      ears: 'ears_headphones_black',
    },
    lines: {
      welcome: ['Tem uma aventura esperando por você!', 'Bora explorar a Divertiland!'],
      cheer: ['Mandou bem!', 'Uhuul!', 'Isso aí!', 'Que demais!'],
      almost: ['Quase! Vamos de novo?', 'Opa! Tenta outra vez!', 'Foi por pouco!'],
      secret: ['Uau! Um lugar secreto!', 'Você achou um segredo!'],
      finish: ['Conseguimos! Que aventura!', 'Você é demais!'],
    },
  },
  mina: {
    id: 'mina',
    name: 'Mina',
    pronoun: 'ela',
    tagline: 'Esperta, curiosa e corajosa!',
    uiColor: '#ff3d9a',
    defaultLook: {
      skin: 'skin_orange',
      top: 'top_mina_outfit',
      bottom: 'bottom_mina_skirt',
      feet: 'feet_pink',
      head: 'head_visor_white',
    },
    lines: {
      welcome: ['Tem uma aventura esperando por você!', 'Vamos descobrir tudo juntos!'],
      cheer: ['Arrasou!', 'Muito bem!', 'Que incrível!', 'Yeeey!'],
      almost: ['Quase! Vamos tentar de novo?', 'Sem problema, tenta mais uma!', 'Foi quase!'],
      secret: ['Olha só! Um segredo!', 'Você é muito observador!'],
      finish: ['Chegamos! Que divertido!', 'Você foi incrível!'],
    },
  },
};
