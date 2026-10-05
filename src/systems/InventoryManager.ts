import { ITEMS, getItem } from '../data/items';
import type { ProfileManager } from './ProfileManager';
import type { SaveManager } from './save/SaveManager';

/** Itens que a criança possui. Itens "default" são sempre considerados possuídos. */
export class InventoryManager {
  constructor(
    private profiles: ProfileManager,
    private save: SaveManager,
  ) {}

  owns(itemId: string): boolean {
    const item = getItem(itemId);
    if (!item) return false;
    if (item.acquire.type === 'default') return true;
    return this.profiles.active?.inventory.includes(itemId) ?? false;
  }

  /** Adiciona um item. Retorna false se já possuía ou o item não existe. */
  grant(itemId: string): boolean {
    const p = this.profiles.active;
    if (!p || !getItem(itemId) || this.owns(itemId)) return false;
    p.inventory.push(itemId);
    this.save.markDirty();
    return true;
  }

  ownedItems() {
    return ITEMS.filter((i) => this.owns(i.id));
  }

  /** Itens possuídos que não são padrão (para conquistas e coleções). */
  earnedCount(): number {
    return this.profiles.active?.inventory.filter((id) => getItem(id)).length ?? 0;
  }

  isNew(itemId: string): boolean {
    const p = this.profiles.active;
    return !!p && this.owns(itemId) && getItem(itemId)?.acquire.type !== 'default' && !p.seenItems.includes(itemId);
  }

  markSeen(itemId: string): void {
    const p = this.profiles.active;
    if (!p || p.seenItems.includes(itemId)) return;
    p.seenItems.push(itemId);
    this.save.markDirty();
  }
}
