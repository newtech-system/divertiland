import { createLogger } from '../../core/Logger';
import type { EventBus } from '../../core/EventBus';
import { defaultSave, migrate } from './SaveSchema';
import type { SaveData } from './SaveTypes';
import type { StorageAdapter } from './StorageAdapter';

const log = createLogger('SaveManager');

export const SAVE_KEY = 'divertiland.save';
export const BACKUP_KEY = 'divertiland.save.backup';
/** Guarda a última cópia corrompida (uma só, para não lotar o armazenamento). */
export const CORRUPT_KEY = 'divertiland.save.corrupt';

/** Envelope gravado no armazenamento: inclui checksum para detectar arquivo corrompido. */
interface Envelope {
  format: 'divertiland-save';
  checksum: string;
  payload: string;
}

/** Hash rápido (FNV-1a) — não é segurança, é detecção de corrupção/truncamento. */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function encodeSave(data: SaveData): string {
  const payload = JSON.stringify(data);
  const env: Envelope = { format: 'divertiland-save', checksum: checksum(payload), payload };
  return JSON.stringify(env);
}

/** Retorna null se o texto estiver corrompido. */
export function decodeSave(text: string | null): SaveData | null {
  if (!text) return null;
  try {
    const env = JSON.parse(text) as Partial<Envelope>;
    if (env?.format !== 'divertiland-save' || typeof env.payload !== 'string') return null;
    if (checksum(env.payload) !== env.checksum) return null;
    return migrate(JSON.parse(env.payload));
  } catch {
    return null;
  }
}

/**
 * Responsável por carregar/gravar o save com segurança (seções 35 e 49):
 * - checksum + backup do último save bom;
 * - validação/saneamento campo a campo;
 * - versionamento com migrações;
 * - gravação agrupada (debounce) para não gravar a cada moeda.
 */
export class SaveManager {
  private _data: SaveData = defaultSave();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private writing: Promise<void> = Promise.resolve();
  /** Origem do último carregamento — útil para diagnóstico/dev tools. */
  loadSource: 'main' | 'backup' | 'new' = 'new';
  /**
   * Só grava depois de ler o save existente. Sem isso, um evento no meio do carregamento
   * (ex.: a aba ficar oculta) gravaria um save VAZIO por cima do progresso da criança.
   */
  private loaded = false;

  constructor(
    private storage: StorageAdapter,
    private bus?: EventBus,
    private debounceMs = 400,
  ) {}

  get data(): SaveData {
    return this._data;
  }

  async load(): Promise<SaveData> {
    let main: string | null = null;
    let backup: string | null = null;
    try {
      main = await this.storage.read(SAVE_KEY);
    } catch (e) {
      log.error('Falha ao ler save principal', e);
    }
    const fromMain = decodeSave(main);
    if (fromMain && (fromMain.profiles.length > 0 || fromMain.emptiedOnPurpose)) {
      this._data = fromMain;
      this.loadSource = 'main';
      this.loaded = true;
      log.info(`Save carregado (${fromMain.profiles.length} perfil(is)).`);
      return this._data;
    }
    if (fromMain) {
      // Save válido mas sem perfis e sem ter sido apagado de propósito: confere o backup
      // antes de aceitar (pode ter sido gravado vazio por engano).
      try {
        backup = await this.storage.read(BACKUP_KEY);
      } catch {
        backup = null;
      }
      const b = decodeSave(backup);
      if (b && b.profiles.length > 0) {
        this._data = b;
        this.loadSource = 'backup';
        this.loaded = true;
        log.warn('Save principal estava vazio sem motivo — progresso recuperado do backup.');
        await this.flush({ skipBackup: true });
        return this._data;
      }
      this._data = fromMain;
      this.loadSource = 'main';
      this.loaded = true;
      return this._data;
    }
    if (main) log.warn('Save principal corrompido — tentando backup.');
    try {
      backup = await this.storage.read(BACKUP_KEY);
    } catch (e) {
      log.error('Falha ao ler backup', e);
    }
    const fromBackup = decodeSave(backup);
    if (fromBackup) {
      this._data = fromBackup;
      this.loadSource = 'backup';
      this.loaded = true;
      log.warn('Save restaurado a partir do backup.');
      // Preserva o arquivo corrompido para análise, sem apagá-lo.
      if (main) await this.safeWrite(CORRUPT_KEY, main);
      await this.flush();
      return this._data;
    }
    if (main) await this.safeWrite(CORRUPT_KEY, main);
    this._data = defaultSave();
    this.loadSource = 'new';
    this.loaded = true;
    log.info('Nenhum save encontrado — começando do zero.');
    return this._data;
  }

  /** Marca que algo mudou; grava em breve (agrupando várias mudanças). */
  markDirty(): void {
    if (!this.loaded) return;
    this._data.updatedAt = Date.now();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.debounceMs);
  }

  /** Grava imediatamente (use em momentos importantes: fim de fase, compra, saída). */
  async flush(opts: { skipBackup?: boolean } = {}): Promise<void> {
    if (!this.loaded) {
      log.warn('Gravação ignorada: o save ainda não foi carregado.');
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const encoded = encodeSave(this._data);
    this.writing = this.writing.then(async () => {
      try {
        // O save atual (se válido) vira backup antes de ser substituído.
        const current = await this.storage.read(SAVE_KEY);
        const cur = current ? decodeSave(current) : null;
        // Nunca troca um backup com perfis por um save vazio.
        if (!opts.skipBackup && cur && (cur.profiles.length > 0 || cur.emptiedOnPurpose)) await this.storage.write(BACKUP_KEY, current!);
        await this.storage.write(SAVE_KEY, encoded);
      } catch (e) {
        log.error('Falha ao gravar save', e);
        this.bus?.emit('saveError', { message: e instanceof Error ? e.message : String(e) });
      }
    });
    return this.writing;
  }

  /** Apaga TODO o progresso (usado só pela ferramenta de dev / tela de pais). */
  async reset(): Promise<void> {
    this._data = defaultSave();
    this._data.emptiedOnPurpose = true;
    this.loaded = true;
    await this.storage.remove(BACKUP_KEY);
    await this.flush({ skipBackup: true });
  }

  exportJson(): string {
    return JSON.stringify(this._data, null, 2);
  }

  importJson(json: string): boolean {
    try {
      this._data = migrate(JSON.parse(json));
      this.loaded = true;
      this.markDirty();
      return true;
    } catch (e) {
      log.error('Importação inválida', e);
      return false;
    }
  }

  private async safeWrite(key: string, value: string) {
    try {
      await this.storage.write(key, value);
    } catch {
      /* sem espaço: não é crítico */
    }
  }
}
