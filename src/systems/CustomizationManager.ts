import type { EventBus } from '../core/EventBus';
import { ITEM_SLOTS, REQUIRED_SLOTS, type CharacterId, type ItemSlot } from '../core/types';
import { CHARACTERS } from '../data/characters';
import { getItem, itemFitsCharacter, type ItemDef } from '../data/items';
import type { InventoryManager } from './InventoryManager';
import type { ProfileManager } from './ProfileManager';
import type { SaveManager } from './save/SaveManager';

export type ResolvedLook = Partial<Record<ItemSlot, ItemDef>>;

/**
 * Customização modular (seção 25). O visual é "slot → item"; o motor 3D apenas desenha
 * o que for resolvido aqui, então trocar placeholders por modelos finais não mexe nas regras.
 */
export class CustomizationManager {
  constructor(
    private profiles: ProfileManager,
    private inventory: InventoryManager,
    private save: SaveManager,
    private bus: EventBus,
  ) {}

  /** Visual final de um personagem (equipado + padrões nos slots obrigatórios). */
  resolveLook(character: CharacterId, preview?: Partial<Record<ItemSlot, string | null>>): ResolvedLook {
    const p = this.profiles.active;
    const equipped = p?.equipped[character] ?? {};
    const defaults = CHARACTERS[character].defaultLook;
    const look: ResolvedLook = {};
    for (const slot of ITEM_SLOTS) {
      let id: string | null | undefined = preview && slot in preview ? preview[slot] : equipped[slot];
      // `undefined` = nunca mexeu nesse slot → usa o padrão; `''`/null = removido de propósito.
      if (id === undefined) id = defaults[slot];
      let item = id ? getItem(id) : undefined;
      if (item && !itemFitsCharacter(item, character)) item = undefined;
      if (!item && REQUIRED_SLOTS.includes(slot) && defaults[slot]) item = getItem(defaults[slot]!);
      if (item) look[slot] = item;
    }
    return look;
  }

  isEquipped(itemId: string, character?: CharacterId): boolean {
    const p = this.profiles.active;
    if (!p) return false;
    const item = getItem(itemId);
    if (!item) return false;
    return this.resolveLook(character ?? p.character)[item.slot]?.id === itemId;
  }

  equip(itemId: string, character?: CharacterId): boolean {
    const p = this.profiles.active;
    const item = getItem(itemId);
    if (!p || !item) return false;
    const c = character ?? p.character;
    if (!this.inventory.owns(itemId) || !itemFitsCharacter(item, c)) return false;
    p.equipped[c][item.slot] = itemId;
    this.save.markDirty();
    this.bus.emit('itemEquipped', { itemId, slot: item.slot });
    return true;
  }

  /** Remove o item de um slot. Slots obrigatórios voltam ao item padrão do personagem. */
  unequip(slot: ItemSlot, character?: CharacterId): void {
    const p = this.profiles.active;
    if (!p) return;
    const c = character ?? p.character;
    if (REQUIRED_SLOTS.includes(slot)) delete p.equipped[c][slot];
    else p.equipped[c][slot] = '';
    this.save.markDirty();
    this.bus.emit('itemEquipped', { itemId: '', slot });
  }
}
