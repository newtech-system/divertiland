import type { EventBus } from '../core/EventBus';
import type { DifficultyId, LevelState } from '../core/types';
import type { ChestDef, LevelData } from '../data/levelTypes';
import { ALL_LEVELS, WORLDS, getLevel } from '../data/worlds';
import type { CurrencyManager } from './CurrencyManager';
import type { InventoryManager } from './InventoryManager';
import type { ProfileManager } from './ProfileManager';
import { defaultLevelProgress } from './save/SaveSchema';
import type { SaveManager } from './save/SaveManager';
import type { InProgressRun, LevelProgress, ProfileData } from './save/SaveTypes';

export type ChestState = 'locked' | 'ready' | 'opened';

/**
 * Estados das fases e regras de desbloqueio (seções 42 e 43).
 * Nada é desbloqueado "de graça": cada fase declara sua regra em worlds.ts.
 */
export class ProgressionManager {
  /** Ferramenta de desenvolvimento: libera todas as fases sem alterar o save. */
  static devUnlockAll = false;

  constructor(
    private profiles: ProfileManager,
    private currency: CurrencyManager,
    private inventory: InventoryManager,
    private save: SaveManager,
    private bus: EventBus,
  ) {}

  progress(levelId: string, profile: ProfileData | null = this.profiles.active): LevelProgress {
    return profile?.levels[levelId] ?? defaultLevelProgress();
  }

  /** Garante que exista um registro de progresso gravável. */
  ensureProgress(levelId: string): LevelProgress {
    const p = this.profiles.require();
    if (!p.levels[levelId]) p.levels[levelId] = defaultLevelProgress();
    return p.levels[levelId];
  }

  totalStars(profile: ProfileData | null = this.profiles.active): number {
    if (!profile) return 0;
    return Object.values(profile.levels).reduce((s, l) => s + l.bestStars, 0);
  }

  worldStars(worldId: string, profile: ProfileData | null = this.profiles.active): number {
    const world = WORLDS.find((w) => w.id === worldId);
    if (!world || !profile) return 0;
    return world.levels.reduce((s, l) => s + (profile.levels[l.id]?.bestStars ?? 0), 0);
  }

  completedCount(profile: ProfileData | null = this.profiles.active): number {
    if (!profile) return 0;
    return Object.values(profile.levels).filter((l) => l.completed).length;
  }

  isUnlocked(level: LevelData, profile: ProfileData | null = this.profiles.active): boolean {
    if (!profile) return false;
    if (ProgressionManager.devUnlockAll) return true;
    const rule = level.unlock;
    if (rule.afterLevels?.some((id) => !profile.levels[id]?.completed)) return false;
    if (rule.minStars && this.totalStars(profile) < rule.minStars) return false;
    if (rule.secretId && !profile.secrets.includes(rule.secretId)) return false;
    return true;
  }

  getState(levelId: string, profile: ProfileData | null = this.profiles.active): LevelState {
    const level = getLevel(levelId);
    if (!level || !profile) return 'LOCKED';
    if (profile.levels[levelId]?.completed) return 'COMPLETED';
    if (!this.isUnlocked(level, profile)) return 'LOCKED';
    if (profile.inProgress?.levelId === levelId) return 'IN_PROGRESS';
    return 'AVAILABLE';
  }

  /** Mapa id → estado, útil para comparar antes/depois e detectar novos desbloqueios. */
  snapshotStates(): Record<string, LevelState> {
    const out: Record<string, LevelState> = {};
    for (const l of ALL_LEVELS) out[l.id] = this.getState(l.id);
    return out;
  }

  /** Fase que o mapa deve destacar: a primeira disponível ainda não concluída. */
  currentLevelId(worldId: string): string | null {
    const world = WORLDS.find((w) => w.id === worldId);
    if (!world) return null;
    const ordered = [...world.levels].filter((l) => l.map.style !== 'secret').sort((a, b) => a.order - b.order);
    const next = ordered.find((l) => {
      const s = this.getState(l.id);
      return s === 'AVAILABLE' || s === 'IN_PROGRESS';
    });
    return next?.id ?? ordered[ordered.length - 1]?.id ?? null;
  }

  // ---------- partida em andamento (IN_PROGRESS) ----------

  startRun(levelId: string, _difficulty: DifficultyId): void {
    const lp = this.ensureProgress(levelId);
    lp.plays += 1;
    this.save.markDirty();
  }

  saveInProgress(run: InProgressRun): void {
    const p = this.profiles.active;
    if (!p) return;
    p.inProgress = { ...run, savedAt: Date.now() };
    this.save.markDirty();
  }

  clearInProgress(levelId?: string): void {
    const p = this.profiles.active;
    if (!p || !p.inProgress) return;
    if (levelId && p.inProgress.levelId !== levelId) return;
    p.inProgress = null;
    this.save.markDirty();
  }

  // ---------- baús ----------

  chestState(chest: ChestDef, worldId: string): ChestState {
    const p = this.profiles.active;
    if (!p) return 'locked';
    if (p.chestsOpened.includes(chest.id)) return 'opened';
    return this.worldStars(worldId) >= chest.stars ? 'ready' : 'locked';
  }

  readyChests(): string[] {
    const out: string[] = [];
    for (const w of WORLDS) for (const c of w.chests) if (this.chestState(c, w.id) === 'ready') out.push(c.id);
    return out;
  }

  openChest(chestId: string): { divertis: number; itemId?: string } | null {
    const p = this.profiles.active;
    if (!p) return null;
    for (const w of WORLDS) {
      const chest = w.chests.find((c) => c.id === chestId);
      if (!chest) continue;
      if (this.chestState(chest, w.id) !== 'ready') return null;
      p.chestsOpened.push(chest.id);
      this.currency.earn(chest.divertis, `bau:${chest.id}`);
      let itemId: string | undefined;
      if (chest.itemId && this.inventory.grant(chest.itemId)) itemId = chest.itemId;
      void this.save.flush();
      this.bus.emit('chestOpened', { chestId });
      return { divertis: chest.divertis, itemId };
    }
    return null;
  }
}
