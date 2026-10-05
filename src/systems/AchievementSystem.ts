import type { EventBus } from '../core/EventBus';
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';
import type { CurrencyManager } from './CurrencyManager';
import type { InventoryManager } from './InventoryManager';
import type { ProfileManager } from './ProfileManager';
import type { ProgressionManager } from './ProgressionManager';
import type { SaveManager } from './save/SaveManager';

/** Conquistas (seção 45). Chame `check()` depois de eventos importantes. */
export class AchievementSystem {
  constructor(
    private profiles: ProfileManager,
    private progression: ProgressionManager,
    private inventory: InventoryManager,
    private currency: CurrencyManager,
    private save: SaveManager,
    private bus: EventBus,
  ) {}

  isUnlocked(id: string): boolean {
    return !!this.profiles.active?.achievements[id];
  }

  /** Valor atual e alvo — para barras de progresso na tela de conquistas. */
  progressOf(a: AchievementDef): { current: number; target: number } {
    const p = this.profiles.active;
    const c = a.condition;
    if (!p) return { current: 0, target: 1 };
    switch (c.type) {
      case 'levelsCompleted':
        return { current: this.progression.completedCount(), target: c.count };
      case 'totalEarned':
        return { current: p.totalEarned, target: c.amount };
      case 'totalStars':
        return { current: this.progression.totalStars(), target: c.count };
      case 'secretsFound':
        return { current: p.secrets.length, target: c.count };
      case 'itemsOwned':
        return { current: this.inventory.earnedCount(), target: c.count };
      case 'stat':
        return { current: p.stats[c.key] ?? 0, target: c.value };
    }
  }

  /** Verifica e concede conquistas novas. Retorna os ids recém-desbloqueados. */
  check(): string[] {
    const p = this.profiles.active;
    if (!p) return [];
    const unlocked: string[] = [];
    // Recompensas podem desbloquear outras conquistas (ex.: 100 Divertis) — repete até estabilizar.
    for (let guard = 0; guard < 5; guard++) {
      let changed = false;
      for (const a of ACHIEVEMENTS) {
        if (p.achievements[a.id]) continue;
        const { current, target } = this.progressOf(a);
        if (current >= target) {
          p.achievements[a.id] = Date.now();
          unlocked.push(a.id);
          changed = true;
          if (a.reward > 0) this.currency.earn(a.reward, `conquista:${a.id}`);
          this.bus.emit('achievementUnlocked', { achievementId: a.id });
        }
      }
      if (!changed) break;
    }
    if (unlocked.length) this.save.markDirty();
    return unlocked;
  }
}
