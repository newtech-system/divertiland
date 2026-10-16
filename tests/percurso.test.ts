import { describe, expect, it } from 'vitest';
import { REACH } from '../src/data/reach';
import { measureReach } from '../src/engine/physics/reachProbe';
import { auditLayout, findTraps } from '../src/levels/exploration/layoutAudit';
import type { LevelLayout } from '../src/levels/exploration/LayoutTypes';
import type { DifficultyId } from '../src/core/types';

/**
 * ÁREA DE TESTE DE MOVIMENTO + VALIDAÇÃO DE PERCURSO (seções 7.1, 12 e 22).
 * Se alguém mexer na física, os números medidos mudam e este teste avisa.
 * Se alguém puser um item ou uma plataforma fora do alcance, a validação acusa.
 */

const LAYOUTS: [string, () => Promise<LevelLayout>][] = [
  ['a01', () => import('../src/data/levels/a01').then((m) => m.LEVEL_A01)],
  ['meu_mundo', () => import('../src/data/levels/meu_mundo').then((m) => m.LEVEL_MEU_MUNDO)],
  ['w1_l01', () => import('../src/data/levels/w1_l01').then((m) => m.LEVEL_W1_L01)],
  ['w1_l05', () => import('../src/data/levels/w1_l05').then((m) => m.LEVEL_W1_L05)],
  ['w1_l06', () => import('../src/data/levels/w1_l06').then((m) => m.LEVEL_W1_L06)],
  ['w1_l07', () => import('../src/data/levels/w1_l07').then((m) => m.LEVEL_W1_L07)],
  ['w1_l08', () => import('../src/data/levels/w1_l08').then((m) => m.LEVEL_W1_L08)],
  ['w1_l09', () => import('../src/data/levels/w1_l09').then((m) => m.LEVEL_W1_L09)],
  ['w1_l10', () => import('../src/data/levels/w1_l10').then((m) => m.LEVEL_W1_L10)],
  ['w1_s01', () => import('../src/data/levels/w1_s01').then((m) => m.LEVEL_W1_S01)],
];

const STYLES: DifficultyId[] = ['sloth', 'monkey', 'jaguar'];

describe('Alcance medido do personagem', () => {
  it('bate com os números documentados em data/reach.ts', () => {
    const m = measureReach('monkey');
    expect(m.jumpHeight).toBeCloseTo(REACH.jumpHeight, 1);
    expect(m.stepUpHeight).toBeCloseTo(REACH.stepUpHeight, 1);
    expect(m.jumpDistanceWalk).toBeCloseTo(REACH.jumpDistanceWalk, 1);
    expect(m.jumpDistanceRun).toBeCloseTo(REACH.jumpDistanceRun, 1);
    expect(m.airtime).toBeCloseTo(REACH.airtime, 1);
  });

  it('o Bicho-Preguiça alcança o mesmo que o Macaco (nunca é pior de controlar)', () => {
    const sloth = measureReach('sloth');
    const monkey = measureReach('monkey');
    expect(sloth.jumpHeight).toBeGreaterThanOrEqual(monkey.jumpHeight - 0.01);
    expect(sloth.jumpDistanceWalk).toBeGreaterThanOrEqual(monkey.jumpDistanceWalk - 0.01);
  });

  it('o trampolim sobe mais a cada quique e tem limite', () => {
    const t = measureReach('monkey').trampolineHeights;
    expect(t.length).toBeGreaterThanOrEqual(3);
    expect(t[1]).toBeGreaterThan(t[0]);
    expect(Math.max(...t)).toBeLessThan(14);
  });
});

describe('Validação de percurso', () => {
  it('acusa item pendurado sem caminho (o validador funciona)', () => {
    const fake: LevelLayout = {
      id: 'teste',
      spawn: { pos: [0, 0, 0], yaw: 0 },
      killY: -6,
      environment: { background: '#fff', fog: '#fff', fogNear: 10, fogFar: 50 },
      music: 'world1',
      entities: [
        { t: 'box', min: [-10, -1, -10], max: [10, 0, 10] },
        { t: 'collectible', id: 'impossivel', pos: [0, 20, 0] },
      ],
    };
    const issues = auditLayout(fake, 'monkey');
    expect(issues.some((i) => i.what.includes('impossivel'))).toBe(true);
  });

  it('acusa buraco sem saída (o caso do totem de chegada, B05)', () => {
    const vala: LevelLayout = {
      id: 'teste',
      spawn: { pos: [0, 0, 0], yaw: 0 },
      killY: -6,
      environment: { background: '#fff', fog: '#fff', fogNear: 10, fogFar: 50 },
      music: 'world1',
      entities: [
        { t: 'box', min: [-16, -1, -8], max: [16, 0, 40] }, // chão
        { t: 'box', min: [-6, 0, 20], max: [6, 7, 36] }, // plataforma alta da chegada
        { t: 'box', min: [-16.5, 0, -8], max: [-16, 12, 40], style: 'wall' },
        { t: 'box', min: [16, 0, -8], max: [16.5, 12, 40], style: 'wall' },
        { t: 'box', min: [-16, 0, 36], max: [16, 12, 36.5], style: 'wall' },
        { t: 'box', min: [-16, 0, 19.5], max: [-6, 12, 20], style: 'wall' },
        { t: 'box', min: [6, 0, 19.5], max: [16, 12, 20], style: 'wall' },
      ],
    };
    const traps = findTraps(vala, 'monkey');
    expect(traps.length).toBeGreaterThanOrEqual(2); // as duas valas dos lados
  });

  it('nenhuma fase tem buraco sem saída', async () => {
    const problems: string[] = [];
    for (const [id, load] of LAYOUTS) {
      const layout = await load();
      for (const d of STYLES) for (const t of findTraps(layout, d)) problems.push(`${id}/${d}: ${t.what} @ ${t.pos.join(',')}`);
    }
    expect(problems).toEqual([]);
  });

  it('todas as fases 3D passam nos três estilos', async () => {
    const problems: string[] = [];
    for (const [id, load] of LAYOUTS) {
      const layout = await load();
      for (const d of STYLES) {
        for (const i of auditLayout(layout, d)) {
          problems.push(`${id}/${d}: ${i.kind} — ${i.what} @ ${i.pos.map((n) => n.toFixed(1)).join(',')} (${i.detail})`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('Nenhuma fase pode ficar impossível de terminar', () => {
  /**
   * Um portão de missão que depende de uma flag que NINGUÉM produz tranca a aventura
   * para sempre. Este teste lê os dados de todas as fases 3D e confere a corrente
   * inteira: portão → flag → missão de algum amigo (ou flag do próprio sistema).
   */
  const DO_SISTEMA = ['helpedEveryone'];

  it('toda flag exigida por portão ou por amigo final é produzida por alguma missão', async () => {
    const problemas: string[] = [];
    for (const [id, load] of LAYOUTS) {
      const layout = await load();
      const produzidas = new Set<string>(DO_SISTEMA);
      for (const e of layout.entities) {
        if (e.t !== 'friend') continue;
        if (e.quest) produzidas.add(e.quest.flag);
        if (e.quest2) produzidas.add(e.quest2.flag);
      }
      for (const e of layout.entities) {
        if (e.t === 'questGate' && !produzidas.has(e.flag)) problemas.push(`${id}: portão ${e.id} espera "${e.flag}", que ninguém liga`);
        if (e.t === 'friend' && e.needsFlag && !produzidas.has(e.needsFlag))
          problemas.push(`${id}: ${e.id} só fala com "${e.needsFlag}", que ninguém liga`);
      }
    }
    expect(problemas).toEqual([]);
  });

  it('todo item de missão pedido por um amigo existe na fase, na quantidade pedida', async () => {
    const problemas: string[] = [];
    for (const [id, load] of LAYOUTS) {
      const layout = await load();
      for (const e of layout.entities) {
        if (e.t !== 'friend') continue;
        for (const q of [e.quest, e.quest2]) {
          if (!q) continue;
          if (q.type === 'collect') {
            const itens = layout.entities.filter((x) => x.t === 'questItem' && x.group === q.group).length;
            if (itens < q.count) problemas.push(`${id}: ${e.id} pede ${q.count} de "${q.group}", mas a fase só tem ${itens}`);
          } else {
            const pads = layout.entities.filter((x) => x.t === 'pad' && x.group === q.group).length;
            if (pads === 0) problemas.push(`${id}: ${e.id} pede botões de "${q.group}", que não existem`);
          }
        }
      }
    }
    expect(problemas).toEqual([]);
  });
});
