// Barramento de eventos tipado. Sistemas se comunicam por eventos em vez de referências diretas,
// o que mantém os módulos independentes (UI, áudio e conquistas reagem sem acoplamento).

export interface GameEvents {
  divertisChanged: { total: number; delta: number; reason: string };
  starsChanged: { total: number };
  levelCompleted: { levelId: string; stars: number };
  levelUnlocked: { levelId: string };
  achievementUnlocked: { achievementId: string };
  itemPurchased: { itemId: string };
  itemEquipped: { itemId: string; slot: string };
  chestOpened: { chestId: string };
  profileChanged: { profileId: string | null };
  settingsChanged: Record<string, never>;
  saveError: { message: string };
}

type Handler<T> = (payload: T) => void;

export class EventBus<E extends object = GameEvents> {
  private handlers = new Map<keyof E, Set<Handler<any>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of [...set]) {
      try {
        h(payload);
      } catch (err) {
        // Um ouvinte com erro nunca deve derrubar o restante do jogo.
        console.error(`[EventBus] erro no ouvinte de "${String(event)}"`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
