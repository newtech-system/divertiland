import { describe, expect, it } from 'vitest';
import { ADVENTURES, MAX_CAMPAIGN_STARS, MAX_GOLDEN_TEDDIES, getAdventure } from '../src/data/adventures';
import { GameServices } from '../src/systems/GameServices';
import type { LevelRunResult } from '../src/systems/LevelResult';
import { MemoryStorageAdapter } from '../src/systems/save/StorageAdapter';
import { migrate, sanitizeSave } from '../src/systems/save/SaveSchema';
import { SAVE_VERSION } from '../src/systems/save/SaveTypes';
import type { DifficultyId } from '../src/core/types';

/**
 * CENÁRIOS OBRIGATÓRIOS da seção 26.2 do prompt mestre V2 que podem ser verificados
 * localmente (sem servidor): identidade permanente dos ursinhos, estrelas que não
 * somam duas vezes, crédito único por objetivo, troca de estilo e migração do save.
 */

async function setup() {
  const s = new GameServices(new MemoryStorageAdapter(), 0);
  await s.init();
  s.profiles.create('Teste', 'mina', 'monkey');
  return s;
}

function run(levelId: string, opts: Partial<LevelRunResult> = {}): LevelRunResult {
  return {
    levelId,
    difficulty: 'monkey',
    completed: true,
    coinsCollected: 0,
    coinsTotal: 10,
    divertisCollected: 0,
    secretsFound: [],
    collectiblesFound: [],
    timeSec: 60,
    flags: [],
    stats: {},
    ...opts,
  };
}

/** Joga a aventura inteira (todas as jogadas) com o mesmo resultado base. */
function playAll(s: GameServices, advId: string, opts: Partial<LevelRunResult> = {}) {
  const adv = getAdventure(advId)!;
  let last: ReturnType<typeof s.adventures.applyRun> | null = null;
  adv.runs.forEach((r, i) => {
    last = s.adventures.applyRun(advId, i, run(r.levelId, opts));
  });
  return last!;
}

describe('Estrutura das cinco aventuras', () => {
  it('são cinco, com 4 a 6 etapas, 3 ursinhos e 2 objetivos bônus cada', () => {
    expect(ADVENTURES).toHaveLength(5);
    for (const a of ADVENTURES) {
      expect(a.stages.length).toBeGreaterThanOrEqual(4);
      expect(a.stages.length).toBeLessThanOrEqual(6);
      expect(a.goldens).toHaveLength(3);
      expect(a.bonusObjectives).toHaveLength(2);
      expect(a.runs.length).toBeGreaterThan(0);
      // Toda etapa é coberta por alguma jogada (nenhuma etapa órfã).
      const covered = new Set(a.runs.flatMap((r) => r.stages));
      for (const st of a.stages) expect(covered.has(st.id)).toBe(true);
      // Seção 15: o aprendizado é dado, não frase solta.
      expect(a.learning.action.length).toBeGreaterThan(10);
      expect(a.learning.verify.length).toBeGreaterThan(10);
    }
    expect(MAX_CAMPAIGN_STARS).toBe(15);
    expect(MAX_GOLDEN_TEDDIES).toBe(15);
  });

  it('todos os ids de ursinho são únicos em todo o jogo', () => {
    const ids = ADVENTURES.flatMap((a) => a.goldens.map((g) => g.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Ursinhos dourados: identidade permanente (26.2 #1 e #2)', () => {
  it('pegar o mesmo ursinho de novo não cria outro nem paga de novo', async () => {
    const s = await setup();
    const saldo0 = s.currency.balance;
    playAll(s, 'a04', { collectiblesFound: ['p_teddy1'] });
    const depois1 = s.adventures.progress('a04').goldens;
    const saldo1 = s.currency.balance;
    // Joga de novo pegando o MESMO ursinho
    playAll(s, 'a04', { collectiblesFound: ['p_teddy1'] });
    const depois2 = s.adventures.progress('a04').goldens;
    expect(depois1).toEqual(['a04_urso_1']);
    expect(depois2).toEqual(['a04_urso_1']); // continua 1/3
    expect(s.adventures.goldenCount().found).toBe(1);
    expect(saldo1).toBeGreaterThan(saldo0);
    // A segunda partida ainda paga a conclusão repetida, mas NÃO o ursinho de novo.
    const pagou = s.ledger.history().filter((e) => e.kind === 'golden');
    expect(pagou).toHaveLength(1);
  });

  it('os três ursinhos em partidas diferentes fecham 3/3 uma única vez', async () => {
    const s = await setup();
    playAll(s, 'a04', { collectiblesFound: ['p_teddy1'] });
    playAll(s, 'a04', { collectiblesFound: ['p_teddy2'] });
    playAll(s, 'a04', { collectiblesFound: ['p_teddy3'] });
    expect(s.adventures.progress('a04').goldens.sort()).toEqual(['a04_urso_1', 'a04_urso_2', 'a04_urso_3']);
    // Bônus de coleção completa: uma vez só, mesmo jogando mais vezes
    playAll(s, 'a04', { collectiblesFound: ['p_teddy1', 'p_teddy2', 'p_teddy3'] });
    const colecao = s.ledger.history().filter((e) => e.reason.includes('Coleção'));
    expect(colecao).toHaveLength(1);
  });
});

describe('Estrelas: conjunto de objetivos, nunca soma repetida (26.2 #4)', () => {
  it('melhorar de 1 para 3 estrelas acrescenta 2, e o total da campanha não passa de 15', async () => {
    const s = await setup();
    playAll(s, 'a04');
    expect(s.adventures.stars('a04')).toBe(1);
    expect(s.adventures.totalStars()).toBe(1);
    // Agora cumpre os dois objetivos bônus
    playAll(s, 'a04', { collectiblesFound: ['p_teddy1', 'p_teddy2', 'p_teddy3'], coinsCollected: 10, coinsTotal: 10 });
    expect(s.adventures.stars('a04')).toBe(3);
    expect(s.adventures.totalStars()).toBe(3);
    // Repetir não soma mais nada
    playAll(s, 'a04', { collectiblesFound: ['p_teddy1', 'p_teddy2', 'p_teddy3'], coinsCollected: 10, coinsTotal: 10 });
    expect(s.adventures.stars('a04')).toBe(3);
    expect(s.adventures.totalStars()).toBe(3);
    expect(s.adventures.totalStars()).toBeLessThanOrEqual(MAX_CAMPAIGN_STARS);
  });

  it('cada objetivo de estrela é pago uma única vez', async () => {
    const s = await setup();
    playAll(s, 'a04', { collectiblesFound: ['p_teddy1', 'p_teddy2', 'p_teddy3'], coinsCollected: 10, coinsTotal: 10 });
    playAll(s, 'a04', { collectiblesFound: ['p_teddy1', 'p_teddy2', 'p_teddy3'], coinsCollected: 10, coinsTotal: 10 });
    const estrelas = s.ledger.history().filter((e) => e.kind === 'star');
    expect(estrelas).toHaveLength(3);
    expect(new Set(estrelas.map((e) => e.key)).size).toBe(3);
  });
});

describe('Troca de estilo (26.2 #3)', () => {
  it('trocar Bicho-Preguiça por Jaguar não reinicia coleção nem cria nova primeira conclusão', async () => {
    const s = await setup();
    playAll(s, 'a04', { difficulty: 'sloth' as DifficultyId, collectiblesFound: ['p_teddy1'] });
    const colecao = [...s.adventures.progress('a04').goldens];
    const primeiras = () => s.ledger.history().filter((e) => e.reason.includes('Primeira conclusão'));
    expect(primeiras()).toHaveLength(1);
    const r = playAll(s, 'a04', { difficulty: 'jaguar' as DifficultyId });
    expect(s.adventures.progress('a04').goldens).toEqual(colecao);
    expect(primeiras()).toHaveLength(1);
    expect(r.kind).toBe('done');
    if (r.kind === 'done') expect(r.outcome.isFirstCompletion).toBe(false);
    // Mas ganha o bônus de concluir num estilo novo (uma vez por estilo)
    expect(s.adventures.progress('a04').completedDifficulties.sort()).toEqual(['jaguar', 'sloth']);
  });
});

describe('Livro-caixa (26.2 #5)', () => {
  it('reenviar a mesma conclusão credita uma vez só', async () => {
    const s = await setup();
    const key = s.ledger.key(['a01', 'primeira']);
    expect(s.ledger.grantOnce(key, 'divertis', 100, 'teste')).toBe(true);
    expect(s.ledger.grantOnce(key, 'divertis', 100, 'teste')).toBe(false);
    expect(s.ledger.history().filter((e) => e.key === key)).toHaveLength(1);
  });

  it('Pontos de Troca saem só de marcos verificáveis, uma vez, e ficam marcados como simulação', async () => {
    const s = await setup();
    expect(s.ledger.tokens).toBe(0);
    playAll(s, 'a04');
    const t1 = s.ledger.tokens;
    expect(t1).toBeGreaterThan(0);
    playAll(s, 'a04');
    expect(s.ledger.tokens).toBe(t1); // repetir a aventura não emite de novo
    for (const e of s.ledger.history()) expect(e.simulated).toBe(true);
  });

  it('nenhuma fonte de pontos paga por tempo online, clique ou repetição', async () => {
    const { TOKEN_SOURCES } = await import('../src/data/rewards');
    for (const src of TOKEN_SOURCES) {
      expect(['umaVezPorAventura', 'umaVezPorColecao', 'umaVezPorCampanha']).toContain(src.limit);
    }
  });

  it('resgate presencial está desligado (modo simulação)', async () => {
    const { redemptionEnabled, REWARD_MODE, PRIZE_TIERS } = await import('../src/data/rewards');
    expect(REWARD_MODE).toBe('simulacao');
    expect(redemptionEnabled()).toBe(false);
    // Nenhuma faixa tem preço em pontos definido antes do orçamento (seção 18.4)
    for (const t of PRIZE_TIERS) expect(t.points).toBeNull();
  });
});

describe('Etapas internas e retomada', () => {
  it('sair no meio guarda o que achou e mantém a aventura pendente', async () => {
    const s = await setup();
    const r = s.adventures.applyRun('a04', 0, run('w1_l05', { completed: false, collectiblesFound: ['p_teddy1'] }));
    expect(r.kind).toBe('incomplete');
    expect(s.adventures.progress('a04').goldens).toEqual(['a04_urso_1']);
    expect(s.adventures.progress('a04').completed).toBe(false);
    expect(s.adventures.state('a04')).not.toBe('COMPLETED');
  });

  it('aventura de várias jogadas avança etapa por etapa e só fecha na última', async () => {
    const s = await setup();
    const adv = getAdventure('a04')!;
    expect(adv.runs.length).toBeGreaterThan(1);
    const r0 = s.adventures.applyRun('a04', 0, run(adv.runs[0].levelId));
    expect(r0.kind).toBe('nextRun');
    expect(s.adventures.progress('a04').completed).toBe(false);
    expect(s.adventures.progress('a04').stagesDone).toEqual(adv.runs[0].stages);
    expect(s.adventures.runIndexToPlay('a04')).toBe(1);
    const r1 = s.adventures.applyRun('a04', 1, run(adv.runs[1].levelId));
    expect(r1.kind).toBe('nextRun');
    const r2 = s.adventures.applyRun('a04', 2, run(adv.runs[2].levelId));
    expect(r2.kind).toBe('done');
    expect(s.adventures.progress('a04').completed).toBe(true);
  });

  it('a próxima aventura só abre depois de concluir a anterior', async () => {
    const s = await setup();
    expect(s.adventures.state('a01')).toBe('AVAILABLE');
    expect(s.adventures.state('a02')).toBe('LOCKED');
    playAll(s, 'a01');
    expect(s.adventures.state('a02')).toBe('AVAILABLE');
  });
});

describe('Save: formato novo e migração (26.2 #13)', () => {
  it('grava e recarrega sem perder nenhum campo novo', async () => {
    const s = await setup();
    playAll(s, 'a04', { collectiblesFound: ['p_teddy1'], secretsFound: ['x1'] });
    await s.save.flush();
    const antes = JSON.parse(JSON.stringify(s.save.data.profiles[0]));
    const depois = sanitizeSave(JSON.parse(JSON.stringify(s.save.data))).profiles[0];
    expect(depois.adventures).toEqual(antes.adventures);
    expect(depois.tokens).toBe(antes.tokens);
    expect(depois.grantedKeys.sort()).toEqual([...antes.grantedKeys].sort());
    expect(depois.ledger).toEqual(antes.ledger);
  });

  it('save antigo (v1, dez fases) vira cinco aventuras sem pagar de novo nem perder dourados', () => {
    const v1 = {
      version: 1,
      createdAt: 1,
      updatedAt: 2,
      activeProfileId: 'p1',
      emptiedOnPurpose: false,
      settings: {},
      profiles: [
        {
          id: 'p1',
          name: 'Theo',
          character: 'jhow',
          preferredDifficulty: 'monkey',
          divertis: 500,
          levels: {
            w1_l05: { completed: true, bestStars: 3, collectiblesFound: ['p_teddy1', 'p_teddy2'], completedDifficulties: ['monkey'], secretsFound: [] },
            w1_l07: { completed: true, bestStars: 2, collectiblesFound: [], completedDifficulties: ['monkey'], secretsFound: [] },
            w1_l08: { completed: true, bestStars: 1, collectiblesFound: [], completedDifficulties: ['monkey'], secretsFound: [] },
            w1_l02: { completed: true, bestStars: 3, collectiblesFound: ['gold_teddy_l02'], completedDifficulties: ['sloth'], secretsFound: [] },
          },
          inventory: ['feet_neon'],
          equipped: { jhow: { feet: 'feet_neon' }, mina: {} },
        },
      ],
    };
    const m = migrate(v1);
    expect(m.version).toBe(SAVE_VERSION);
    const p = m.profiles[0];
    // A04 = w1_l05 + w1_l07 + w1_l08: todas concluídas → aventura concluída
    expect(p.adventures.a04.completed).toBe(true);
    expect(p.adventures.a04.goldens.sort()).toEqual(['a04_urso_1', 'a04_urso_2']);
    expect(p.adventures.a04.objectivesMet).toContain('completed');
    // A02 = w1_l02 + w1_l04: só a primeira foi concluída → NÃO está concluída
    expect(p.adventures.a02.completed).toBe(false);
    expect(p.adventures.a02.goldens).toEqual(['a02_urso_1']);
    // Pontos de Troca nunca nascem de save antigo (B40)
    expect(p.tokens).toBe(0);
    // Divertis de brincadeira continuam
    expect(p.divertis).toBe(500);
    // Looks preservados
    expect(p.inventory).toContain('feet_neon');
    expect(p.equipped.jhow.feet).toBe('feet_neon');
    // A primeira conclusão já consta como paga, para a migração não pagar de novo
    expect(p.grantedKeys).toContain('p1:a04:primeira');
    // E o histórico das fases antigas continua guardado (nada é apagado)
    expect(p.levels.w1_l05.completed).toBe(true);
  });

  it('migrar duas vezes dá o mesmo resultado (idempotente)', () => {
    const v1 = {
      version: 1,
      activeProfileId: 'p1',
      profiles: [
        {
          id: 'p1',
          name: 'Sara',
          character: 'mina',
          divertis: 10,
          levels: { w1_l05: { completed: true, collectiblesFound: ['p_teddy1'], completedDifficulties: ['sloth'] } },
        },
      ],
    };
    const um = migrate(v1);
    const dois = migrate(JSON.parse(JSON.stringify({ ...um, version: 1 })));
    expect(dois.profiles[0].adventures).toEqual(um.profiles[0].adventures);
    expect(dois.profiles[0].grantedKeys.sort()).toEqual(um.profiles[0].grantedKeys.sort());
    expect(dois.profiles[0].tokens).toBe(0);
  });
});
