import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../src/data/economy';
import { getLevel } from '../src/data/worlds';
import { GameServices } from '../src/systems/GameServices';
import type { LevelRunResult } from '../src/systems/LevelResult';
import { ProfileManager } from '../src/systems/ProfileManager';
import { StarManager } from '../src/systems/StarManager';
import { MemoryStorageAdapter } from '../src/systems/save/StorageAdapter';

async function setup() {
  const storage = new MemoryStorageAdapter();
  const s = new GameServices(storage, 0);
  await s.init();
  s.profiles.create('Ana', 'jhow', 'monkey');
  return { s, storage };
}

function run(partial: Partial<LevelRunResult> = {}): LevelRunResult {
  return {
    levelId: 'w1_l01',
    difficulty: 'monkey',
    completed: true,
    coinsCollected: 10,
    coinsTotal: 100,
    divertisCollected: 10,
    secretsFound: [],
    collectiblesFound: [],
    timeSec: 300,
    flags: [],
    stats: {},
    ...partial,
  };
}

describe('Perfis', () => {
  it('limpa nomes e usa padrão para nome vazio', () => {
    expect(ProfileManager.cleanName('  <Ana>   Clara  ')).toBe('Ana Clara');
    expect(ProfileManager.cleanName('   ')).toBe('Explorador');
    expect(ProfileManager.cleanName('NomeMuitoMuitoComprido')).toHaveLength(14);
  });

  it('perfil novo começa com Divertis iniciais e fase 1 disponível', async () => {
    const { s } = await setup();
    expect(s.currency.balance).toBe(ECONOMY.startingDivertis);
    expect(s.progression.getState('w1_l01')).toBe('AVAILABLE');
    expect(s.progression.getState('w1_l02')).toBe('LOCKED');
  });
});

describe('Estrelas', () => {
  const level = getLevel('w1_l01')!;
  it('1 estrela só por concluir', () => {
    expect(StarManager.evaluate(level, run()).stars).toBe(1);
  });
  it('0 estrelas sem concluir', () => {
    expect(StarManager.evaluate(level, run({ completed: false })).stars).toBe(0);
  });
  it('caminhos diferentes chegam a 3 estrelas', () => {
    const viaSecretAndCoins = run({ coinsCollected: 80, secretsFound: ['w1_l01_secret_room'] });
    const viaTeddiesAndCoins = run({ coinsCollected: 70, collectiblesFound: ['t1', 't2', 't3'] });
    expect(StarManager.evaluate(level, viaSecretAndCoins).stars).toBe(3);
    expect(StarManager.evaluate(level, viaTeddiesAndCoins).stars).toBe(3);
  });
  it('nunca passa de 3 estrelas', () => {
    const all = run({ coinsCollected: 100, secretsFound: ['w1_l01_secret_room'], collectiblesFound: ['a', 'b', 'c'] });
    expect(StarManager.evaluate(level, all).stars).toBe(3);
  });
  it('tempo leva em conta o estilo de aventura', () => {
    const lvl = getLevel('w1_l02')!; // objetivo: 120 s
    const r = run({ levelId: 'w1_l02', timeSec: 150 });
    const fast = lvl.objectives.find((o) => o.type === 'timeUnder')!;
    expect(StarManager.isObjectiveMet(fast, r, { timeMul: 1 } as any)).toBe(false);
    expect(StarManager.isObjectiveMet(fast, r, { timeMul: 1.6 } as any)).toBe(true);
  });
});

describe('Ciclo da fase (conclusão → recompensa → desbloqueio)', () => {
  it('primeira conclusão paga recompensa e libera a próxima fase', async () => {
    const { s } = await setup();
    const before = s.currency.balance;
    const out = s.completion.apply(run({ coinsCollected: 80, divertisCollected: 90 }));
    expect(out.isFirstCompletion).toBe(true);
    expect(out.stars).toBe(2);
    expect(out.unlockedLevels).toContain('w1_l02');
    expect(s.progression.getState('w1_l01')).toBe('COMPLETED');
    expect(s.progression.getState('w1_l02')).toBe('AVAILABLE');
    // a conquista "Primeira Aventura" é concedida
    expect(out.achievements).toContain('first_adventure');
    const expectedLevelPart = 90 + Math.round((ECONOMY.levelRewards.main.firstCompletion + 2 * ECONOMY.perNewStar) * 1.1);
    expect(out.totalDivertis).toBe(expectedLevelPart);
    expect(s.currency.balance).toBeGreaterThanOrEqual(before + expectedLevelPart);
  });

  it('repetir a fase paga menos e não repete bônus de estrelas', async () => {
    const { s } = await setup();
    s.completion.apply(run({ coinsCollected: 80 }));
    const out2 = s.completion.apply(run({ coinsCollected: 80, divertisCollected: 5 }));
    expect(out2.isFirstCompletion).toBe(false);
    const labels = out2.rewardLines.map((l) => l.label);
    expect(labels).not.toContain('Estrelas novas!');
    expect(out2.totalDivertis).toBe(5 + Math.round(ECONOMY.levelRewards.main.replayCompletion * 1.1));
  });

  it('melhor resultado é mantido (estrelas não diminuem)', async () => {
    const { s } = await setup();
    s.completion.apply(run({ coinsCollected: 90, secretsFound: ['w1_l01_secret_room'] }));
    s.completion.apply(run({ coinsCollected: 0 }));
    expect(s.progression.progress('w1_l01').bestStars).toBe(3);
  });

  it('3 estrelas pela primeira vez dá item de recompensa', async () => {
    const { s } = await setup();
    const out = s.completion.apply(run({ coinsCollected: 90, collectiblesFound: ['a', 'b', 'c'] }));
    expect(out.itemsGranted).toContain('head_crown');
    expect(s.inventory.owns('head_crown')).toBe(true);
  });

  it('segredo abre a fase secreta', async () => {
    const { s } = await setup();
    expect(s.progression.getState('w1_s01')).toBe('LOCKED');
    const out = s.completion.apply(run({ secretsFound: ['w1_l01_secret_room'] }));
    expect(out.unlockedLevels).toContain('w1_s01');
  });

  it('sair no meio guarda segredos, mas não conclui', async () => {
    const { s } = await setup();
    const out = s.completion.apply(run({ completed: false, secretsFound: ['w1_l01_secret_room'] }));
    expect(out.stars).toBe(0);
    expect(s.progression.getState('w1_l01')).toBe('AVAILABLE');
    expect(s.profiles.active!.secrets).toContain('w1_l01_secret_room');
  });

  it('partida em andamento marca IN_PROGRESS e é limpa ao concluir', async () => {
    const { s } = await setup();
    s.progression.saveInProgress({
      levelId: 'w1_l01', difficulty: 'sloth', checkpointId: 'cp2', collectedIds: ['c1'], secretsFound: [], collectiblesFound: [], elapsedSec: 40, savedAt: 0,
    });
    expect(s.progression.getState('w1_l01')).toBe('IN_PROGRESS');
    s.completion.apply(run());
    expect(s.profiles.active!.inProgress).toBeNull();
  });

  it('Bicho-Preguiça nunca recebe MENOS que a base', async () => {
    const { s } = await setup();
    const out = s.completion.apply(run({ difficulty: 'sloth', divertisCollected: 0 }));
    const base = ECONOMY.levelRewards.main.firstCompletion + ECONOMY.perNewStar;
    expect(out.totalDivertis).toBe(base);
  });

  it('concluir em um novo estilo dá bônus', async () => {
    const { s } = await setup();
    s.completion.apply(run({ difficulty: 'sloth' }));
    const out = s.completion.apply(run({ difficulty: 'jaguar' }));
    expect(out.rewardLines.some((l) => l.label === 'Novo estilo de aventura!')).toBe(true);
  });
});

describe('Loja, inventário e customização', () => {
  it('compra desconta Divertis e adiciona ao inventário', async () => {
    const { s } = await setup();
    s.currency.earn(100, 't');
    const res = s.shop.purchase('face_glasses_star');
    expect(res.ok).toBe(true);
    expect(s.currency.balance).toBe(130 - 60);
    expect(s.inventory.owns('face_glasses_star')).toBe(true);
  });

  it('não compra sem saldo, item repetido ou item que não é da loja', async () => {
    const { s } = await setup();
    expect(s.shop.purchase('back_cape_hero')).toEqual({ ok: false, reason: 'noFunds' });
    expect(s.currency.balance).toBe(30);
    s.currency.earn(500, 't');
    s.shop.purchase('feet_neon');
    expect(s.shop.purchase('feet_neon')).toEqual({ ok: false, reason: 'owned' });
    expect(s.shop.purchase('head_crown')).toEqual({ ok: false, reason: 'notForSale' });
    expect(s.shop.purchase('nao_existe')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('itens secretos ficam escondidos na loja até serem obtidos', async () => {
    const { s } = await setup();
    expect(s.shop.listings().some((l) => l.item.id === 'face_glasses_secret')).toBe(false);
    s.inventory.grant('face_glasses_secret');
    expect(s.shop.listings().some((l) => l.item.id === 'face_glasses_secret')).toBe(true);
  });

  it('equipar e remover itens; slots obrigatórios voltam ao padrão', async () => {
    const { s } = await setup();
    s.currency.earn(500, 't');
    expect(s.customization.resolveLook('jhow').face).toBeUndefined();
    expect(s.customization.equip('face_glasses_star')).toBe(false); // não possui
    s.shop.purchase('face_glasses_star');
    s.shop.purchase('feet_neon');
    expect(s.customization.equip('face_glasses_star')).toBe(true);
    expect(s.customization.equip('feet_neon')).toBe(true);
    let look = s.customization.resolveLook('jhow');
    expect(look.face?.id).toBe('face_glasses_star');
    expect(look.feet?.id).toBe('feet_neon');
    s.customization.unequip('feet');
    s.customization.unequip('ears');
    look = s.customization.resolveLook('jhow');
    expect(look.feet?.id).toBe('feet_turquoise');
    expect(look.ears).toBeUndefined();
  });

  it('itens exclusivos de personagem respeitam o personagem', async () => {
    const { s } = await setup();
    expect(s.customization.equip('top_mina_outfit', 'jhow')).toBe(false);
    expect(s.customization.equip('top_mina_outfit', 'mina')).toBe(true);
  });

  it('cada personagem guarda o próprio visual', async () => {
    const { s } = await setup();
    expect(s.customization.resolveLook('mina').head?.id).toBe('head_visor_white');
    expect(s.customization.resolveLook('jhow').ears?.id).toBe('ears_headphones_black');
  });

  it('comprar o primeiro item dá conquista Estilo Próprio', async () => {
    const { s } = await setup();
    s.currency.earn(100, 't');
    s.shop.purchase('head_cap_purple');
    expect(s.achievements.check()).toContain('stylish');
  });
});

describe('Baús', () => {
  it('baú abre com estrelas suficientes e só uma vez', async () => {
    const { s } = await setup();
    const p = s.profiles.active!;
    p.levels.w1_l01 = { ...s.progression.progress('w1_l01'), completed: true, bestStars: 3 };
    expect(s.progression.openChest('w1_chest_1')).toBeNull(); // 3 < 5
    p.levels.w1_l02 = { ...s.progression.progress('w1_l02'), completed: true, bestStars: 2 };
    const res = s.progression.openChest('w1_chest_1');
    expect(res?.divertis).toBe(30);
    expect(s.inventory.owns('top_tee_gold')).toBe(true);
    expect(s.progression.openChest('w1_chest_1')).toBeNull();
  });
});
