import { EventBus } from '../core/EventBus';
import { AchievementSystem } from './AchievementSystem';
import { CurrencyManager } from './CurrencyManager';
import { CustomizationManager } from './CustomizationManager';
import { InventoryManager } from './InventoryManager';
import { LevelCompletionService } from './LevelCompletionService';
import { ProfileManager } from './ProfileManager';
import { ProgressionManager } from './ProgressionManager';
import { SaveManager } from './save/SaveManager';
import type { StorageAdapter } from './save/StorageAdapter';
import { ShopManager } from './ShopManager';

/**
 * Agrupa todos os sistemas de regras do jogo com suas dependências.
 * O GameManager (camada visual) recebe este objeto pronto; os testes criam um com
 * armazenamento em memória.
 */
export class GameServices {
  readonly bus = new EventBus();
  readonly save: SaveManager;
  readonly profiles: ProfileManager;
  readonly currency: CurrencyManager;
  readonly inventory: InventoryManager;
  readonly customization: CustomizationManager;
  readonly shop: ShopManager;
  readonly progression: ProgressionManager;
  readonly achievements: AchievementSystem;
  readonly completion: LevelCompletionService;

  constructor(storage: StorageAdapter, saveDebounceMs = 400) {
    this.save = new SaveManager(storage, this.bus, saveDebounceMs);
    this.profiles = new ProfileManager(this.save, this.bus);
    this.currency = new CurrencyManager(this.profiles, this.save, this.bus);
    this.inventory = new InventoryManager(this.profiles, this.save);
    this.customization = new CustomizationManager(this.profiles, this.inventory, this.save, this.bus);
    this.shop = new ShopManager(this.profiles, this.currency, this.inventory, this.save, this.bus);
    this.progression = new ProgressionManager(this.profiles, this.currency, this.inventory, this.save, this.bus);
    this.achievements = new AchievementSystem(
      this.profiles,
      this.progression,
      this.inventory,
      this.currency,
      this.save,
      this.bus,
    );
    this.completion = new LevelCompletionService(
      this.profiles,
      this.progression,
      this.currency,
      this.inventory,
      this.achievements,
      this.save,
      this.bus,
    );
  }

  async init(): Promise<void> {
    await this.save.load();
  }
}
