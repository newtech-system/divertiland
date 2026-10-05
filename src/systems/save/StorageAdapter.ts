/**
 * Camada de armazenamento. O SaveManager só conhece esta interface, então trocar o
 * armazenamento local por nuvem/backend no futuro não exige mexer no resto do jogo.
 * (Ex.: CloudStorageAdapter que sincroniza com um servidor e usa o local como cache.)
 */
export interface StorageAdapter {
  readonly name: string;
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class MemoryStorageAdapter implements StorageAdapter {
  readonly name = 'memory';
  readonly store = new Map<string, string>();
  async read(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  async write(key: string, value: string) {
    this.store.set(key, value);
  }
  async remove(key: string) {
    this.store.delete(key);
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'localStorage';
  private fallback = new MemoryStorageAdapter();
  private available: boolean;

  constructor() {
    this.available = LocalStorageAdapter.isAvailable();
  }

  static isAvailable(): boolean {
    try {
      const k = '__dl_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  get persistent() {
    return this.available;
  }

  async read(key: string) {
    if (!this.available) return this.fallback.read(key);
    try {
      return window.localStorage.getItem(key);
    } catch {
      return this.fallback.read(key);
    }
  }

  async write(key: string, value: string) {
    if (!this.available) return this.fallback.write(key, value);
    // Deixa o erro (ex.: armazenamento cheio) subir para o SaveManager registrar.
    window.localStorage.setItem(key, value);
  }

  async remove(key: string) {
    if (!this.available) return this.fallback.remove(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignora */
    }
  }
}
