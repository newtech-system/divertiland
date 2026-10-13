import { describe, expect, it } from 'vitest';
import { ADVENTURES, getAdventure } from '../src/data/adventures';
import { EXTRA_LEVELS, getLevel } from '../src/data/worlds';
import { LEVEL_A01 } from '../src/data/levels/a01';
import { LEVEL_MEU_MUNDO } from '../src/data/levels/meu_mundo';
import { CheckpointManager } from '../src/levels/exploration/CheckpointManager';
import type { CheckpointInfo } from '../src/levels/exploration/LevelBuilder';
import { GameServices } from '../src/systems/GameServices';
import type { LevelRunResult } from '../src/systems/LevelResult';
import { MemoryStorageAdapter } from '../src/systems/save/StorageAdapter';
import { sanitizeSave } from '../src/systems/save/SaveSchema';
import type { InProgressRun } from '../src/systems/save/SaveTypes';

/**
 * TESTES DE ACEITAÇÃO DO MARCO 2 (seção 8 do documento MARCO_2_DIVERTILAND).
 *
 * Aqui ficam as verificações que dão para fazer sem gráficos: a história da Aventura 1
 * está inteira nos dados e é alcançável, o mapa diz a verdade sobre o estado de cada
 * aventura, continuar uma partida não perde etapa nem flag, a ajuda não atravessa portão
 * fechado, os Divertis de cada etapa são creditados e os Pontos de Troca continuam em
 * simulação. O alcance geométrico do percurso é testado em tests/percurso.test.ts.
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
    timeSec: 120,
    flags: [],
    stats: {},
    ...opts,
  };
}

/** Todas as etapas que o CONTEÚDO da a01 sabe concluir. */
function stagesInLayout(): string[] {
  const out: string[] = [];
  for (const e of LEVEL_A01.entities) {
    if (e.t === 'message' && e.stage) out.push(e.stage);
    if (e.t === 'finish' && e.stage) out.push(e.stage);
    if (e.t === 'questGate' && e.stage) out.push(e.stage);
    if (e.t === 'friend') {
      if (e.stageMeet) out.push(e.stageMeet);
      if (e.stage) out.push(e.stage);
      if (e.stage2) out.push(e.stage2);
    }
  }
  return out;
}

describe('Aventura 1: a história está inteira no conteúdo', () => {
  it('as seis etapas da aventura têm quem as conclua dentro da fase', () => {
    const adv = getAdventure('a01')!;
    const inLayout = new Set(stagesInLayout());
    for (const st of adv.stages) expect([st.id, inLayout.has(st.id)]).toEqual([st.id, true]);
    // E nada marca uma etapa que não existe na aventura.
    const known = new Set(adv.stages.map((s) => s.id));
    for (const id of inLayout) expect([id, known.has(id)]).toEqual([id, true]);
  });

  it('a missão é ajudar alguém: a criança triste pede, e a devolução é na mão dela', () => {
    const bia = LEVEL_A01.entities.find((e) => e.t === 'friend' && e.id === 'bia');
    expect(bia).toBeDefined();
    if (bia?.t !== 'friend') throw new Error('bia não é um amigo');
    // acolher (etapa 2) acontece já na conversa, antes de qualquer coleta
    expect(bia.stageMeet).toBe('a01_e2');
    // as pistas são a primeira missão; a DEVOLUÇÃO é a segunda e fecha a história
    expect(bia.quest).toEqual({ type: 'collect', group: 'pistas', count: 3, flag: 'achouPistas' });
    expect(bia.quest2).toEqual({ type: 'collect', group: 'ursinho', count: 1, flag: 'devolveu' });
    expect(bia.stage2).toBe('a01_e5');
  });

  it('são três pistas de verdade, em três lugares diferentes do parque', () => {
    const pistas = LEVEL_A01.entities.filter((e) => e.t === 'questItem' && e.group === 'pistas');
    expect(pistas).toHaveLength(3);
    const pos = pistas.map((e) => (e.t === 'questItem' ? e.pos : [0, 0, 0]));
    // nenhuma pista a menos de 5 m de outra (não são três botões no mesmo canto)
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const d = Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1], pos[i][2] - pos[j][2]);
        expect(d).toBeGreaterThan(5);
      }
    }
  });

  it('o mecanismo do caminho existe: 2 peças de apoio e um portão que abre com elas', () => {
    const apoios = LEVEL_A01.entities.filter((e) => e.t === 'questItem' && e.group === 'apoio');
    expect(apoios).toHaveLength(2);
    const beto = LEVEL_A01.entities.find((e) => e.t === 'friend' && e.id === 'beto');
    if (beto?.t !== 'friend') throw new Error('beto não é um amigo');
    expect(beto.quest).toEqual({ type: 'collect', group: 'apoio', count: 2, flag: 'caminhoPronto' });
    expect(beto.stage).toBe('a01_e4');
    const gates = LEVEL_A01.entities.filter((e) => e.t === 'questGate');
    expect(gates.some((g) => g.t === 'questGate' && g.flag === 'caminhoPronto')).toBe(true);
    // a festa (etapa 6) só abre depois da devolução
    expect(gates.some((g) => g.t === 'questGate' && g.flag === 'devolveu')).toBe(true);
  });

  it('há três ursinhos parecidos e só um é o da Bia (os outros explicam por quê)', () => {
    const certo = LEVEL_A01.entities.filter((e) => e.t === 'questItem' && e.group === 'ursinho');
    expect(certo).toHaveLength(1);
    const parecidos = LEVEL_A01.entities.filter((e) => e.t === 'friend' && e.id.startsWith('urso_'));
    expect(parecidos).toHaveLength(2);
    for (const p of parecidos) {
      if (p.t !== 'friend') continue;
      expect(p.quest).toBeUndefined(); // não dá para "pegar" o ursinho errado
      expect(p.intro.toLowerCase()).toContain('rosa'); // diz qual é o certo
    }
  });

  it('a sala secreta e os três ursinhos dourados estão no lugar combinado', () => {
    const adv = getAdventure('a01')!;
    const secret = LEVEL_A01.entities.find((e) => e.t === 'secretZone' && e.id === 'a01_sala_secreta');
    expect(secret).toBeDefined();
    expect(adv.bonusObjectives.some((o) => o.type === 'secret' && o.secretId === 'a01_sala_secreta')).toBe(true);
    const ids = LEVEL_A01.entities.filter((e) => e.t === 'collectible').map((e) => (e.t === 'collectible' ? e.id : ''));
    for (const g of adv.goldens) {
      expect(g.from).toBeDefined();
      expect(ids).toContain(g.from);
    }
    expect(adv.finalContent).toBe(true);
  });

  it('a estrela bônus de ajudar alguém a mais tem quem a cumpra na fase', () => {
    const adv = getAdventure('a01')!;
    const flagObj = adv.bonusObjectives.find((o) => o.type === 'flag');
    expect(flagObj?.type === 'flag' && flagObj.flag).toBe('helpedExtra');
    const dino = LEVEL_A01.entities.find((e) => e.t === 'friend' && e.id === 'dino');
    if (dino?.t !== 'friend') throw new Error('dino não é um amigo');
    expect(dino.quest?.flag).toBe('helpedExtra');
  });
});

describe('A ajuda nunca pula etapa da história (seção 6)', () => {
  it('todo ponto seguro depois de um portão de missão declara a flag que ele precisa', () => {
    // O ponto seguro DENTRO do recanto (x < -9) só vale depois da missão do Beto; os do
    // trampolim (z >= 156), só depois da devolução. Sem isso, a ajuda "Vamos juntos?"
    // levaria a criança para o outro lado de um portão fechado.
    for (const e of LEVEL_A01.entities) {
      if (e.t !== 'checkpoint') continue;
      const [x, , z] = e.pos;
      if (z >= 156) expect([e.id, e.needsFlag]).toEqual([e.id, 'devolveu']);
      else if (x < -9 && z > 130) expect([e.id, e.needsFlag]).toEqual([e.id, 'caminhoPronto']);
      else expect([e.id, e.needsFlag]).toEqual([e.id, undefined]);
    }
  });

  it('o próximo ponto seguro ignora o que está atrás de um portão fechado', () => {
    // bandeira de mentirinha: o gerenciador pinta o mastro ao ativar
    const flag = { material: { color: { set: () => {} } } };
    const cps = [
      { id: 'cp3', order: 0, flag, active: false },
      { id: 'cp4', order: 1, needsFlag: 'caminhoPronto', flag, active: false },
      { id: 'cp5', order: 2, needsFlag: 'devolveu', flag, active: false },
    ] as unknown as CheckpointInfo[];
    const m = new CheckpointManager(cps, { pos: { x: 0, y: 0, z: 0 }, yaw: 0 });
    const flags = new Set<string>();
    // sem filtro (fase sem portões) o próximo é simplesmente o seguinte
    expect(m.nextSafeCheckpoint()?.id).toBe('cp3');
    // já na praça (cp3), nada cumprido: não existe destino liberado adiante
    m.activate('cp3');
    expect(m.nextSafeCheckpoint((c) => !c.needsFlag || flags.has(c.needsFlag))).toBeNull();
    flags.add('caminhoPronto');
    expect(m.nextSafeCheckpoint((c) => !c.needsFlag || flags.has(c.needsFlag))?.id).toBe('cp4');
  });
});

describe('Continuar a aventura não perde a história (seção 7.4)', () => {
  it('etapas, flags e estado dos amigos sobrevivem ao salvamento e ao saneamento', async () => {
    const s = await setup();
    const p = s.profiles.active!;
    const snap: InProgressRun = {
      levelId: 'a01',
      difficulty: 'monkey',
      checkpointId: 'cp3',
      collectedIds: ['coin_1'],
      secretsFound: ['a01_sala_secreta'],
      collectiblesFound: ['a01_urso_1'],
      elapsedSec: 300,
      savedAt: Date.now(),
      stagesDone: ['a01_e1', 'a01_e2', 'a01_e3'],
      questFlags: ['achouPistas', 'caminhoPronto'],
      questFriends: ['bia:new:1', 'beto:done:0', 'dino:active:0'],
    };
    s.progression.saveInProgress(snap);
    await s.save.flush();

    // Passa pelo mesmo caminho de um jogo reaberto: texto salvo → saneamento.
    const raw = JSON.parse(JSON.stringify(s.save.data));
    const clean = sanitizeSave(raw);
    const ip = clean.profiles.find((x) => x.id === p.id)!.inProgress!;
    expect(ip.stagesDone).toEqual(['a01_e1', 'a01_e2', 'a01_e3']);
    expect(ip.questFlags).toEqual(['achouPistas', 'caminhoPronto']);
    expect(ip.questFriends).toContain('bia:new:1');
    expect(ip.checkpointId).toBe('cp3');
  });

  it('sair no meio guarda os dourados e mantém a aventura pendente', async () => {
    const s = await setup();
    const out = s.adventures.applyRun('a01', 0, run('a01', { completed: false, collectiblesFound: ['a01_urso_2'] }));
    expect(out.kind).toBe('incomplete');
    expect(s.adventures.progress('a01').goldens).toEqual(['a01_urso_2']);
    expect(s.adventures.progress('a01').completed).toBe(false);
    expect(s.adventures.state('a01')).toBe('IN_PROGRESS');
  });
});

describe('Aventura 1 de ponta a ponta', () => {
  it('concluir tudo dá 3 estrelas, 3 dourados, a peça do Meu Mundo e libera a Aventura 2', async () => {
    const s = await setup();
    const out = s.adventures.applyRun(
      'a01',
      0,
      run('a01', {
        collectiblesFound: ['a01_urso_1', 'a01_urso_2', 'a01_urso_3'],
        secretsFound: ['a01_sala_secreta'],
        flags: ['helpedExtra'],
        divertisCollected: 40,
        coinsCollected: 40,
        stagesDone: ['a01_e1', 'a01_e2', 'a01_e3', 'a01_e4', 'a01_e5', 'a01_e6'],
      }),
    );
    expect(out.kind).toBe('done');
    if (out.kind !== 'done') return;
    const o = out.outcome;
    expect(o.stars).toBe(3);
    expect(o.newGoldens).toHaveLength(3);
    expect(o.goldensTotal).toEqual({ found: 3, of: 15 });
    expect(o.stagesDone).toHaveLength(6);
    expect(o.itemsGranted).toContain('world_recanto_ursinho');
    expect(o.learningLine.length).toBeGreaterThan(10);
    expect(s.adventures.state('a02')).toBe('AVAILABLE');
    // o aprendizado é verificável: a etapa da devolução está entre as concluídas
    expect(o.stagesDone.some((st) => st.stageId === 'a01_e5')).toBe(true);
  });

  it('numa aventura de duas jogadas, os Divertis da primeira etapa são creditados', async () => {
    const s = await setup();
    const adv = getAdventure('a02')!;
    expect(adv.runs.length).toBeGreaterThan(1);
    const antes = s.currency.balance;
    const r1 = s.adventures.applyRun('a02', 0, run(adv.runs[0].levelId, { divertisCollected: 25, coinsCollected: 25 }));
    expect(r1.kind).toBe('nextRun');
    if (r1.kind !== 'nextRun') return;
    expect(r1.divertis).toBe(25);
    expect(s.currency.balance).toBe(antes + 25);
    const r2 = s.adventures.applyRun('a02', 1, run(adv.runs[1].levelId, { divertisCollected: 10, coinsCollected: 10 }));
    expect(r2.kind).toBe('done');
    // o total final inclui os Divertis da segunda etapa (os da primeira já entraram)
    if (r2.kind === 'done') expect(s.currency.balance).toBeGreaterThanOrEqual(antes + 35);
  });
});

describe('O mapa diz a verdade', () => {
  it('no começo só a Aventura 1 está disponível e as outras aparecem trancadas', async () => {
    const s = await setup();
    expect(s.adventures.state('a01')).toBe('AVAILABLE');
    for (const a of ADVENTURES.slice(1)) expect([a.id, s.adventures.state(a.id)]).toEqual([a.id, 'LOCKED']);
  });

  it('só a Aventura 1 se apresenta como conteúdo final; as outras são provisórias', () => {
    expect(getAdventure('a01')!.finalContent).toBe(true);
    for (const a of ADVENTURES.slice(1)) expect([a.id, a.finalContent]).toEqual([a.id, false]);
  });

  it('a próxima etapa é anunciada em linguagem de criança', async () => {
    const s = await setup();
    const next = s.adventures.nextStage('a01');
    expect(next?.mission.length).toBeGreaterThan(5);
    expect(next?.name).toBe('Chegar e aprender');
  });
});

describe('Meu Mundo: espaço livre honesto', () => {
  it('é marcado como espaço livre, sem estrela e sem objetivo', () => {
    const lvl = getLevel('meu_mundo')!;
    expect(lvl.sandbox).toBe(true);
    expect(lvl.objectives).toEqual([]);
    expect(EXTRA_LEVELS.map((l) => l.id)).toContain('meu_mundo');
  });

  it('o terreno é seguro: sem lava, sem zona de queda e com saída sinalizada', () => {
    const e = LEVEL_MEU_MUNDO.entities;
    expect(e.some((x) => x.t === 'killZone')).toBe(false);
    expect(e.some((x) => x.t === 'box' && x.surface === 'lava')).toBe(false);
    expect(e.some((x) => x.t === 'finish')).toBe(true); // o portal de volta
    // nada de moeda: entrar e sair do terreno não pode render Divertis repetido
    expect(e.some((x) => x.t === 'coin' || x.t === 'coinLine' || x.t === 'coinArc' || x.t === 'gem')).toBe(false);
  });

  it('tem um terreno reservado e identificado para a peça de cada aventura', () => {
    const texts = LEVEL_MEU_MUNDO.entities.filter((x) => x.t === 'sign').map((x) => (x.t === 'sign' ? x.text : ''));
    for (const a of ADVENTURES) expect(texts.some((t) => t.includes(a.worldPiece.name))).toBe(true);
  });
});
