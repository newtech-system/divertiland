import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout } from '../../levels/exploration/LayoutTypes';
import type { DifficultyId } from '../../core/types';

/**
 * FASE 3 — CORREDOR MALUCO (runner, fase curta)
 * Três faixas. O personagem corre sozinho; a criança troca de faixa, pula e abaixa.
 * Faixa -1 = esquerda da tela, 0 = meio, 1 = direita da tela.
 * Obstáculos marcados com `notIn: ['sloth']` somem no Bicho-Preguiça (menos obstáculos).
 */
export const LANE_W = 2.2;
export const laneX = (lane: number) => -lane * LANE_W;

export interface RunnerCourse {
  layout: LevelLayout;
  length: number;
}

type Lane = -1 | 0 | 1;

export function buildRunnerCourse(difficulty: DifficultyId): RunnerCourse {
  const E: LayoutEntity[] = [];
  const add = (e: LayoutEntity, notIn?: DifficultyId[]) => {
    if (notIn?.includes(difficulty)) return;
    E.push(e);
  };
  const LENGTH = 1400;
  const W = LANE_W * 1.5 + 0.6; // meia largura da pista

  // Pista, paredes e decoração repetida
  add({ t: 'box', min: [-W, -0.5, -20], max: [W, 0, LENGTH + 40], style: 'mat', color: '#ffd1ec' });
  add({ t: 'box', min: [-W - 1, 0, -20], max: [-W, 3.2, LENGTH + 40], style: 'wall', color: PALETTE.purpleLight });
  add({ t: 'box', min: [W, 0, -20], max: [W + 1, 3.2, LENGTH + 40], style: 'wall', color: PALETTE.purpleLight });
  add({ t: 'box', min: [-W - 1, 0, LENGTH + 40], max: [W + 1, 6, LENGTH + 41], style: 'wall', color: PALETTE.purple });
  for (let z = 0; z < LENGTH + 30; z += 10) {
    for (const s of [-1, 1]) {
      add({ t: 'box', min: [s * (LANE_W / 2) - 0.06, 0, z], max: [s * (LANE_W / 2) + 0.06, 0.03, z + 5], style: 'neon', color: '#ffffff' });
    }
  }
  const signs = ['DIVERTILAND', 'CORRE!', 'UHUUL!', 'VAI QUE VAI!', 'SUPER RÁPIDO', 'DIVERTIS!'];
  for (let z = 20, i = 0; z < LENGTH; z += 45, i++) {
    add({ t: 'decor', kind: 'neonSign', pos: [i % 2 ? W + 0.45 : -W - 0.45, 4.5, z], yaw: i % 2 ? -Math.PI / 2 : Math.PI / 2, text: signs[i % signs.length], color: [PALETTE.pink, PALETTE.green, PALETTE.yellow, PALETTE.cyan][i % 4], size: 0.6 });
    add({ t: 'decor', kind: 'balloons', pos: [i % 2 ? -W + 0.4 : W - 0.4, 3.2, z + 20] });
    if (i % 3 === 0) add({ t: 'decor', kind: 'arch', pos: [0, 0, z + 10], size: 1.65 });
    add({ t: 'decor', kind: 'stripe', pos: [W - 0.05, 2.2, z], yaw: Math.PI / 2, color: [PALETTE.yellow, PALETTE.greenNeon, PALETTE.pink][i % 3], size: 4 });
    add({ t: 'decor', kind: 'stripe', pos: [-W + 0.05, 2.2, z + 22], yaw: Math.PI / 2, color: [PALETTE.cyan, PALETTE.orange, PALETTE.pink][i % 3], size: 4 });
  }

  // ---------- peças de obstáculo
  const low = (z: number, lane: Lane, notIn?: DifficultyId[]) => {
    const x = laneX(lane);
    add({ t: 'box', min: [x - LANE_W / 2 + 0.15, 0, z], max: [x + LANE_W / 2 - 0.15, 0.75, z + 0.5], color: PALETTE.orange }, notIn);
  };
  const high = (z: number, lane: Lane, notIn?: DifficultyId[]) => {
    const x = laneX(lane);
    add({ t: 'box', min: [x - LANE_W / 2 + 0.1, 1.0, z], max: [x + LANE_W / 2 - 0.1, 1.55, z + 0.4], color: PALETTE.cyan }, notIn);
    for (const s of [-1, 1]) add({ t: 'box', min: [x + s * (LANE_W / 2 - 0.05) - 0.07, 0, z + 0.1], max: [x + s * (LANE_W / 2 - 0.05) + 0.07, 1.55, z + 0.3], color: '#ffffff', camera: false }, notIn);
  };
  const block = (z: number, lane: Lane, len = 2, notIn?: DifficultyId[]) => {
    const x = laneX(lane);
    add({ t: 'box', min: [x - LANE_W / 2 + 0.12, 0, z], max: [x + LANE_W / 2 - 0.12, 2.6, z + len], color: [PALETTE.purple, PALETTE.pink, PALETTE.green][Math.abs(Math.round(z)) % 3] }, notIn);
  };
  /** Bloco comprido com rampa na frente: dá para subir e correr por cima. */
  const platform = (z: number, lane: Lane, len: number, hgt = 1.6) => {
    const x = laneX(lane);
    add({ t: 'ramp', min: [x - LANE_W / 2 + 0.15, 0, z], max: [x + LANE_W / 2 - 0.15, hgt, z + 4], axis: 'z', h0: 0, h1: hgt, color: PALETTE.yellow });
    add({ t: 'box', min: [x - LANE_W / 2 + 0.15, 0, z + 4], max: [x + LANE_W / 2 - 0.15, hgt, z + 4 + len], color: PALETTE.purple });
  };
  const coins = (z0: number, z1: number, lane: Lane, y = 0.8, count?: number) =>
    add({ t: 'coinLine', from: [laneX(lane), y, z0], to: [laneX(lane), y, z1], count: count ?? Math.max(2, Math.round((z1 - z0) / 2.5)) });
  const arcCoins = (z: number, lane: Lane) => {
    for (let i = 0; i < 5; i++) add({ t: 'coin', pos: [laneX(lane), 0.9 + Math.sin((i / 4) * Math.PI) * 1.3, z - 2.5 + i * 1.25] });
  };
  const gem = (z: number, lane: Lane, y = 1) => add({ t: 'gem', pos: [laneX(lane), y, z] });
  const msg = (id: string, z: number, text: string, icon: string, mission?: string, tutorial = true) =>
    add({ t: 'message', id, min: [-W, 0, z], max: [W, 4, z + 3], text, icon, mission, tutorial });
  const pad = (z: number, lane: Lane) => add({ t: 'box', min: [laneX(lane) - 0.8, 0, z], max: [laneX(lane) + 0.8, 0.15, z + 1.6], color: PALETTE.greenNeon, surface: 'trampoline' });

  // ---------- percurso (ritmo: aprende → pratica → combina → especial → final)
  add({ t: 'decor', kind: 'neonSign', pos: [0, 5.2, -4], yaw: 0, text: 'CORREDOR MALUCO', color: PALETTE.pink, size: 0.9 });
  coins(8, 30, 0);
  msg('r_lanes', 4, 'Deslize para os lados (ou use ⬅️ ➡️) para trocar de faixa!', '↔️', 'Corra até a chegada!');
  coins(34, 46, -1);
  coins(50, 62, 1);
  msg('r_jump', 64, 'Barreira laranja: pule! (deslize para cima ou ESPAÇO)', '⬆️');
  low(78, 0);
  low(78, -1);
  low(78, 1);
  arcCoins(78, 0);
  msg('r_slide', 92, 'Barra azul: abaixe! (deslize para baixo ou ⬇️)', '⬇️');
  high(108, 0);
  high(108, -1);
  high(108, 1);
  coins(104, 112, 0, 0.5, 4);
  msg('r_block', 120, 'Bloco grande: troque de faixa!', '↔️');
  block(136, 0, 3);
  coins(130, 142, -1);
  block(150, -1, 3);
  block(150, 1, 3, ['sloth']);
  coins(146, 156, 0);

  // Prática
  let z = 170;
  const rows: [Lane, 'low' | 'high' | 'block'][][] = [
    [[0, 'low'], [1, 'block']],
    [[-1, 'high'], [0, 'high']],
    [[1, 'low'], [-1, 'block']],
    [[0, 'block'], [1, 'high']],
    [[-1, 'low'], [0, 'low'], [1, 'low']],
    [[0, 'high'], [-1, 'block']],
  ];
  for (const row of rows) {
    for (const [lane, kind] of row) {
      if (kind === 'low') low(z, lane);
      else if (kind === 'high') high(z, lane);
      else block(z, lane, 2.5);
    }
    const free = ([-1, 0, 1] as Lane[]).find((l) => !row.some(([rl]) => rl === l));
    if (free !== undefined) coins(z - 6, z + 3, free);
    else arcCoins(z, 0);
    z += difficulty === 'sloth' ? 30 : 24;
  }

  // Plataformas (blocos compridos com rampa) + gema #1 lá em cima
  msg('r_ramp', z - 6, 'Suba pela rampa amarela e corra lá em cima!', '🛹', undefined, false);
  platform(z, 0, 26);
  coins(z + 5, z + 29, 0, 2.4);
  gem(z + 18, 0, 2.6);
  block(z + 6, -1, 6, ['sloth']);
  low(z + 16, 1);
  low(z + 24, -1, ['sloth']);
  z += 46;

  // Seção especial: túnel neon com super pulos
  msg('r_pads', z - 8, 'Almofada verde: SUPER PULO! Pegue as moedas no alto!', '🤸', 'Super pulos!', false);
  for (let i = 0; i < 5; i++) add({ t: 'decor', kind: 'ring', pos: [0, 2.6, z + i * 8], color: [PALETTE.pink, PALETTE.yellow, PALETTE.cyan][i % 3], size: 2.3 });
  pad(z, 0);
  for (let i = 0; i < 6; i++) add({ t: 'coin', pos: [laneX(0), 2 + Math.sin((i / 5) * Math.PI) * 3, z + 2 + i * 2] });
  pad(z + 22, -1);
  for (let i = 0; i < 6; i++) add({ t: 'coin', pos: [laneX(-1), 2 + Math.sin((i / 5) * Math.PI) * 3, z + 24 + i * 2] });
  gem(z + 29, -1, 4.6);
  pad(z + 44, 1);
  for (let i = 0; i < 6; i++) add({ t: 'coin', pos: [laneX(1), 2 + Math.sin((i / 5) * Math.PI) * 3, z + 46 + i * 2] });
  z += 70;

  // Combinações mais rápidas
  const rows2: [Lane, 'low' | 'high' | 'block'][][] = [
    [[-1, 'block'], [0, 'low'], [1, 'block']],
    [[-1, 'high'], [0, 'block'], [1, 'high']],
    [[-1, 'low'], [0, 'high'], [1, 'low']],
    [[0, 'block'], [1, 'block']],
    [[-1, 'block'], [0, 'block']],
    [[-1, 'low'], [0, 'low'], [1, 'low']],
    [[-1, 'high'], [0, 'high'], [1, 'high']],
  ];
  for (const row of rows2) {
    for (const [lane, kind] of row) {
      if (kind === 'low') low(z, lane);
      else if (kind === 'high') high(z, lane);
      else block(z, lane, 3, row.length === 3 && difficulty === 'sloth' ? ['sloth'] : undefined);
    }
    const free = ([-1, 0, 1] as Lane[]).filter((l) => !row.some(([rl, k]) => rl === l && k === 'block'));
    if (free.length) coins(z - 5, z + 4, free[0]);
    z += difficulty === 'sloth' ? 28 : difficulty === 'jaguar' ? 18 : 22;
  }

  // Plataformas em sequência + gema #2
  platform(z, -1, 18);
  platform(z + 26, 1, 18);
  coins(z + 5, z + 21, -1, 2.4);
  coins(z + 31, z + 47, 1, 2.4);
  gem(z + 40, 1, 2.6);
  block(z + 8, 0, 4, ['sloth']);
  low(z + 30, 0);
  z += 60;

  // Zigue-zague: blocos alternados obrigam a trocar de faixa várias vezes
  msg('r_zig', z - 6, 'Zigue-zague! Esquerda, direita...', '🐍', undefined, false);
  const zig: Lane[] = [1, -1, 0, 1, -1, 0];
  zig.forEach((free, i) => {
    for (const l of [-1, 0, 1] as Lane[]) if (l !== free) block(z + i * 14, l, 2.5, i % 2 && l === 0 ? ['sloth'] : undefined);
    coins(z + i * 14 - 4, z + i * 14 + 3, free, 0.8, 4);
  });
  z += zig.length * 14 + 14;

  // Mistura rápida de pular/abaixar em todas as faixas
  for (let i = 0; i < 6; i++) {
    if (i % 2 === 0) for (const l of [-1, 0, 1] as Lane[]) low(z, l);
    else for (const l of [-1, 0, 1] as Lane[]) high(z, l, i === 3 ? ['sloth'] : undefined);
    if (i % 2 === 0) arcCoins(z, ((i % 3) - 1) as Lane);
    z += difficulty === 'sloth' ? 22 : 16;
  }
  z += 10;

  // Reta final cheia de moedas + gema #3 no meio de uma barra
  msg('r_final', z - 4, 'Reta final! Vai, vai, vai!', '🏁', 'Chegue na linha de chegada!', false);
  for (let i = 0; i < 4; i++) {
    const lane = ([-1, 1, 0, -1] as Lane[])[i];
    low(z + i * 16, lane);
    high(z + 8 + i * 16, (lane === 1 ? 0 : 1) as Lane, ['sloth']);
    coins(z + i * 16 - 3, z + i * 16 + 6, (lane === 0 ? 1 : 0) as Lane);
  }
  gem(z + 40, 0, 0.5);
  z += 72;

  const finishZ = Math.min(z + 10, LENGTH);
  add({ t: 'finish', pos: [0, 0, finishZ] });
  add({ t: 'decor', kind: 'neonSign', pos: [0, 5.5, finishZ + 6], yaw: Math.PI, text: 'CHEGADA!', color: PALETTE.yellow, size: 1 });
  add({ t: 'npc', character: 'guide', pos: [2.6, 0, finishZ + 3], yaw: Math.PI, anim: 'dance' });

  return {
    length: finishZ,
    layout: {
      id: 'w1_l03',
      spawn: { pos: [0, 0, 0], yaw: 0 },
      killY: -6,
      environment: { background: '#ffd9f0', fog: '#ffe3f4', fogNear: 25, fogFar: 85 },
      music: 'world1',
      entities: E,
    },
  };
}
