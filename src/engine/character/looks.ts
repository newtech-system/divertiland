import { ITEM_SLOTS, type CharacterId } from '../../core/types';
import { CHARACTERS } from '../../data/characters';
import { getItem } from '../../data/items';
import type { ResolvedLook } from '../../systems/CustomizationManager';

/** Visual padrão de um mascote (para NPCs e telas sem perfil). */
export function defaultLook(character: CharacterId): ResolvedLook {
  const look: ResolvedLook = {};
  const d = CHARACTERS[character].defaultLook;
  for (const slot of ITEM_SLOTS) {
    const id = d[slot];
    const item = id ? getItem(id) : undefined;
    if (item) look[slot] = item;
  }
  return look;
}

export function otherCharacter(c: CharacterId): CharacterId {
  return c === 'jhow' ? 'mina' : 'jhow';
}
