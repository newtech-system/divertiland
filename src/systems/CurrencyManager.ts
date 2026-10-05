import type { EventBus } from '../core/EventBus';
import { createLogger } from '../core/Logger';
import type { ProfileManager } from './ProfileManager';
import type { SaveManager } from './save/SaveManager';

const log = createLogger('Divertis');

/** DIVERTIS — a moeda da Divertiland (seção 22). */
export class CurrencyManager {
  constructor(
    private profiles: ProfileManager,
    private save: SaveManager,
    private bus: EventBus,
  ) {}

  get balance(): number {
    return this.profiles.active?.divertis ?? 0;
  }

  canAfford(amount: number): boolean {
    return this.balance >= amount;
  }

  earn(amount: number, reason: string): number {
    const p = this.profiles.active;
    const value = Math.max(0, Math.round(amount));
    if (!p || value === 0) return 0;
    p.divertis += value;
    p.totalEarned += value;
    this.save.markDirty();
    this.bus.emit('divertisChanged', { total: p.divertis, delta: value, reason });
    return value;
  }

  /** Retorna false (sem alterar nada) se o saldo não for suficiente. */
  spend(amount: number, reason: string): boolean {
    const p = this.profiles.active;
    const value = Math.max(0, Math.round(amount));
    if (!p) return false;
    if (p.divertis < value) {
      log.warn(`Saldo insuficiente para "${reason}" (${p.divertis} < ${value})`);
      return false;
    }
    p.divertis -= value;
    this.save.markDirty();
    this.bus.emit('divertisChanged', { total: p.divertis, delta: -value, reason });
    return true;
  }
}
