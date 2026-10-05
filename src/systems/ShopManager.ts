import type { EventBus } from '../core/EventBus';
import type { ShopCategory } from '../core/types';
import { ITEMS, getItem, itemFitsCharacter, type ItemDef } from '../data/items';
import type { CurrencyManager } from './CurrencyManager';
import type { InventoryManager } from './InventoryManager';
import type { ProfileManager } from './ProfileManager';
import type { SaveManager } from './save/SaveManager';

export type PurchaseResult =
  | { ok: true; item: ItemDef }
  | { ok: false; reason: 'unknown' | 'owned' | 'notForSale' | 'noFunds' | 'noProfile' };

export interface ShopListing {
  item: ItemDef;
  owned: boolean;
  affordable: boolean;
  forSale: boolean;
  fitsCharacter: boolean;
  isNew: boolean;
}

/**
 * Loja Divertiland (seção 24). Só Divertis de jogo — sem dinheiro real, sem loot box.
 * A confirmação em dois toques (evita compra acidental) fica na interface.
 */
export class ShopManager {
  constructor(
    private profiles: ProfileManager,
    private currency: CurrencyManager,
    private inventory: InventoryManager,
    private save: SaveManager,
    private bus: EventBus,
  ) {}

  listings(category: ShopCategory | 'all' = 'all'): ShopListing[] {
    const p = this.profiles.active;
    return ITEMS.filter((i) => i.acquire.type !== 'default')
      .filter((i) => category === 'all' || i.category === category)
      .filter((i) => !i.hidden || this.inventory.owns(i.id))
      .map((item) => ({
        item,
        owned: this.inventory.owns(item.id),
        affordable: this.currency.canAfford(item.price),
        forSale: item.acquire.type === 'shop',
        fitsCharacter: p ? itemFitsCharacter(item, p.character) : true,
        isNew: this.inventory.isNew(item.id),
      }));
  }

  purchase(itemId: string): PurchaseResult {
    if (!this.profiles.active) return { ok: false, reason: 'noProfile' };
    const item = getItem(itemId);
    if (!item) return { ok: false, reason: 'unknown' };
    if (this.inventory.owns(itemId)) return { ok: false, reason: 'owned' };
    if (item.acquire.type !== 'shop') return { ok: false, reason: 'notForSale' };
    if (!this.currency.spend(item.price, `compra:${itemId}`)) return { ok: false, reason: 'noFunds' };
    this.inventory.grant(itemId);
    this.profiles.addStat('itemsPurchased');
    void this.save.flush();
    this.bus.emit('itemPurchased', { itemId });
    return { ok: true, item };
  }

  /** Como obter um item que não está à venda (texto curto para a interface). */
  static howToGet(item: ItemDef): string {
    switch (item.acquire.type) {
      case 'levelReward':
        return '3 estrelas numa fase especial';
      case 'chest':
        return 'Abra um baú do mapa';
      case 'achievement':
        return 'Ganhe uma conquista';
      case 'secret':
        return item.acquire.hint;
      default:
        return '';
    }
  }
}
