import { describe, expect, it } from 'vitest';
import { GameServices } from '../src/systems/GameServices';
import { BACKUP_KEY, SAVE_KEY, decodeSave, encodeSave } from '../src/systems/save/SaveManager';
import { defaultSave, migrate, sanitizeSave } from '../src/systems/save/SaveSchema';
import { MemoryStorageAdapter } from '../src/systems/save/StorageAdapter';

async function freshServices(storage = new MemoryStorageAdapter()) {
  const s = new GameServices(storage, 0);
  await s.init();
  return { s, storage };
}

describe('SaveManager', () => {
  it('começa vazio quando não há save', async () => {
    const { s } = await freshServices();
    expect(s.save.loadSource).toBe('new');
    expect(s.save.data.profiles).toHaveLength(0);
  });

  it('grava e recarrega o progresso (fechar e abrir o jogo)', async () => {
    const { s, storage } = await freshServices();
    s.profiles.create('Ana', 'mina', 'sloth');
    s.currency.earn(100, 'teste');
    await s.save.flush();

    const { s: s2 } = await freshServices(storage);
    expect(s2.save.loadSource).toBe('main');
    expect(s2.profiles.active?.name).toBe('Ana');
    expect(s2.profiles.active?.character).toBe('mina');
    expect(s2.currency.balance).toBe(130); // 30 iniciais + 100
  });

  it('recupera do backup quando o save principal está corrompido', async () => {
    const { s, storage } = await freshServices();
    s.profiles.create('Leo', 'jhow', 'monkey');
    await s.save.flush();
    s.currency.earn(50, 'teste');
    await s.save.flush(); // agora existe backup com o estado anterior
    storage.store.set(SAVE_KEY, storage.store.get(SAVE_KEY)!.slice(0, 40)); // truncado

    const { s: s2 } = await freshServices(storage);
    expect(s2.save.loadSource).toBe('backup');
    expect(s2.profiles.active?.name).toBe('Leo');
  });

  it('detecta adulteração/corrupção pelo checksum', () => {
    const enc = encodeSave(defaultSave());
    expect(decodeSave(enc)).not.toBeNull();
    const env = JSON.parse(enc);
    env.payload = env.payload.replace('"profiles":[]', '"profiles":[{}]');
    const tampered = JSON.stringify(env);
    expect(decodeSave(tampered)).toBeNull();
    expect(decodeSave('lixo')).toBeNull();
    expect(decodeSave(null)).toBeNull();
  });

  it('saneia campos inválidos sem descartar o perfil', () => {
    const data = sanitizeSave({
      activeProfileId: 'p1',
      profiles: [
        { id: 'p1', name: 'Bia', character: 'dragão', divertis: -50, levels: { w1_l01: { bestStars: 99, completed: 'sim' } }, inventory: [1, 'feet_neon'] },
        'lixo',
      ],
      settings: { masterVolume: 7, quality: 'ultra' },
    });
    expect(data.profiles).toHaveLength(1);
    const p = data.profiles[0];
    expect(p.name).toBe('Bia');
    expect(p.character).toBe('jhow');
    expect(p.divertis).toBe(0);
    expect(p.levels.w1_l01.bestStars).toBe(3);
    expect(p.levels.w1_l01.completed).toBe(false);
    expect(p.inventory).toEqual(['feet_neon']);
    expect(data.settings.masterVolume).toBe(1);
    expect(data.settings.quality).toBe('medium');
    expect(data.activeProfileId).toBe('p1');
  });

  it('migra saves antigos (sem versão) para o formato atual', () => {
    const m = migrate({ profiles: [{ id: 'x', name: 'Teo' }] });
    expect(m.version).toBeGreaterThanOrEqual(1);
    expect(m.profiles[0].name).toBe('Teo');
  });

  it('reset apaga o progresso', async () => {
    const { s, storage } = await freshServices();
    s.profiles.create('Ana', 'mina', 'sloth');
    await s.save.flush();
    await s.save.reset();
    expect(s.save.data.profiles).toHaveLength(0);
    expect(storage.store.has(BACKUP_KEY)).toBe(false);
  });
});

describe('Proteção contra perda de progresso', () => {
  it('NÃO grava nada antes de carregar o save (evita sobrescrever com save vazio)', async () => {
    const storage = new MemoryStorageAdapter();
    const a = new GameServices(storage, 0);
    await a.init();
    a.profiles.create('Ana', 'mina', 'sloth');
    await a.save.flush();
    const before = storage.store.get(SAVE_KEY);
    // Nova sessão: algo tenta gravar ANTES do load terminar (ex.: aba ficou oculta)
    const b = new GameServices(storage, 0);
    await b.save.flush();
    b.save.markDirty();
    expect(storage.store.get(SAVE_KEY)).toBe(before);
    await b.init();
    expect(b.profiles.list).toHaveLength(1);
  });

  it('recupera do backup quando o save principal ficou vazio sem querer', async () => {
    const storage = new MemoryStorageAdapter();
    const a = new GameServices(storage, 0);
    await a.init();
    a.profiles.create('Leo', 'jhow', 'monkey');
    await a.save.flush();
    await a.save.flush(); // garante backup com o perfil
    // Simula um save vazio gravado por engano no principal
    const { encodeSave } = await import('../src/systems/save/SaveManager');
    const { defaultSave } = await import('../src/systems/save/SaveSchema');
    storage.store.set(SAVE_KEY, encodeSave(defaultSave()));
    const b = new GameServices(storage, 0);
    await b.init();
    expect(b.save.loadSource).toBe('backup');
    expect(b.profiles.list[0]?.name).toBe('Leo');
  });

  it('respeita quando a família apagou os perfis de propósito', async () => {
    const storage = new MemoryStorageAdapter();
    const a = new GameServices(storage, 0);
    await a.init();
    const p = a.profiles.create('Bia', 'mina', 'sloth');
    await a.save.flush();
    await a.save.flush();
    a.profiles.remove(p.id);
    await a.save.flush();
    const b = new GameServices(storage, 0);
    await b.init();
    expect(b.profiles.list).toHaveLength(0);
  });

  it('um save vazio nunca substitui um backup com perfis', async () => {
    const storage = new MemoryStorageAdapter();
    const a = new GameServices(storage, 0);
    await a.init();
    a.profiles.create('Teo', 'jhow', 'jaguar');
    await a.save.flush();
    await a.save.flush();
    const { encodeSave } = await import('../src/systems/save/SaveManager');
    const { defaultSave } = await import('../src/systems/save/SaveSchema');
    storage.store.set(SAVE_KEY, encodeSave(defaultSave()));
    await a.save.flush(); // tenta girar o backup
    const b = new GameServices(storage, 0);
    await b.init();
    expect(b.profiles.list[0]?.name).toBe('Teo');
  });
});
