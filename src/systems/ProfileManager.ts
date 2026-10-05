import type { EventBus } from '../core/EventBus';
import type { CharacterId, DifficultyId } from '../core/types';
import { uid } from '../core/util';
import { ECONOMY } from '../data/economy';
import { createProfile } from './save/SaveSchema';
import type { SaveManager } from './save/SaveManager';
import type { ProfileData } from './save/SaveTypes';

export const MAX_PROFILES = 6;
export const MAX_NAME_LENGTH = 14;

/** Perfis das crianças (seção 5). Só o apelido é guardado — nenhum dado pessoal extra. */
export class ProfileManager {
  constructor(
    private save: SaveManager,
    private bus: EventBus,
  ) {}

  get list(): ProfileData[] {
    return this.save.data.profiles;
  }

  get active(): ProfileData | null {
    const id = this.save.data.activeProfileId;
    return this.save.data.profiles.find((p) => p.id === id) ?? null;
  }

  /** Igual a `active`, mas lança erro se não houver perfil — para sistemas que exigem um. */
  require(): ProfileData {
    const p = this.active;
    if (!p) throw new Error('Nenhum perfil ativo');
    return p;
  }

  static cleanName(name: string): string {
    const cleaned = name
      .replace(/[<>{}\\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_NAME_LENGTH);
    return cleaned || 'Explorador';
  }

  create(name: string, character: CharacterId, difficulty: DifficultyId): ProfileData {
    if (this.list.length >= MAX_PROFILES) throw new Error('Limite de perfis atingido');
    const p = createProfile(uid('p'), ProfileManager.cleanName(name), character, difficulty, ECONOMY.startingDivertis);
    this.save.data.profiles.push(p);
    this.save.data.emptiedOnPurpose = false;
    this.select(p.id);
    return p;
  }

  select(id: string): boolean {
    const p = this.list.find((x) => x.id === id);
    if (!p) return false;
    this.save.data.activeProfileId = id;
    p.lastPlayedAt = Date.now();
    this.save.markDirty();
    this.bus.emit('profileChanged', { profileId: id });
    return true;
  }

  signOut(): void {
    this.save.data.activeProfileId = null;
    this.save.markDirty();
    this.bus.emit('profileChanged', { profileId: null });
  }

  remove(id: string): void {
    const data = this.save.data;
    data.profiles = data.profiles.filter((p) => p.id !== id);
    if (data.profiles.length === 0) data.emptiedOnPurpose = true;
    if (data.activeProfileId === id) data.activeProfileId = null;
    this.save.markDirty();
    this.bus.emit('profileChanged', { profileId: data.activeProfileId });
  }

  setCharacter(character: CharacterId): void {
    const p = this.require();
    p.character = character;
    this.save.markDirty();
    this.bus.emit('profileChanged', { profileId: p.id });
  }

  setPreferredDifficulty(d: DifficultyId): void {
    const p = this.require();
    p.preferredDifficulty = d;
    this.save.markDirty();
  }

  rename(name: string): void {
    const p = this.require();
    p.name = ProfileManager.cleanName(name);
    this.save.markDirty();
    this.bus.emit('profileChanged', { profileId: p.id });
  }

  addStat(key: string, amount = 1): void {
    const p = this.active;
    if (!p) return;
    p.stats[key] = (p.stats[key] ?? 0) + amount;
    this.save.markDirty();
  }

  markTutorialSeen(id: string): void {
    const p = this.active;
    if (!p || p.tutorialsSeen.includes(id)) return;
    p.tutorialsSeen.push(id);
    this.save.markDirty();
  }
}
