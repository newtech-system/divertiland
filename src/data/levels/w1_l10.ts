import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout, Vec3 } from '../../levels/exploration/LayoutTypes';

/**
 * FASE 10 — SUPER DESAFIO DIVERTILAND (fase bônus longa — seção 20)
 * Um "evento" que mistura tudo o que a criança aprendeu:
 *  1 largada → 2 PORTA DA MEMÓRIA (sequência no chão) → 3 TORRE DE TRAMPOLINS →
 *  4 PARKOUR NO ALTO (martelos, plataformas que somem e que andam) → 5 ESCORREGADOR GIGANTE →
 *  6 CORREDOR MALUCO (+ SALA SECRETA) → 7 O CHÃO É LAVA → CHEGADA
 * 5 ursinhos dourados escondidos pelo caminho.
 */
const E: LayoutEntity[] = [];
const add = (...e: LayoutEntity[]) => E.push(...e);
const msg = (id: string, min: Vec3, max: Vec3, text: string, icon: string, mission?: string, tutorial = false, minHint = 0) =>
  add({ t: 'message', id, min, max, text, icon, mission, tutorial, minHint });
const H = 26;
const W = 16;
const wallC = '#d8c4ff';

// ---------- estrutura geral
add(
  { t: 'box', min: [-W, -0.5, -10], max: [W, 0, 190], style: 'mat', color: '#f1e6ff' },
  { t: 'box', min: [-W - 0.5, 0, -10], max: [-W, H, 262], style: 'wall', color: wallC },
  { t: 'box', min: [W, 0, -10], max: [W + 0.5, H, 166], style: 'wall', color: wallC },
  { t: 'box', min: [W, 0, 176], max: [W + 0.5, H, 262], style: 'wall', color: wallC },
  { t: 'box', min: [W, 4.4, 166], max: [W + 0.5, H, 176], style: 'wall', color: wallC },
  { t: 'box', min: [-W, 0, -10.5], max: [W, H, -10], style: 'wall', color: '#ffc6e6' },
  { t: 'box', min: [-W, 0, 262], max: [W, H, 262.5], style: 'wall', color: '#ffc6e6' },
  { t: 'box', min: [-W, H, -10], max: [W, H + 0.5, 262], style: 'wall', color: '#8a5cff', camera: false },
);
for (let z = 0; z < 262; z += 13) {
  add({ t: 'decor', kind: 'lightPanel', pos: [-6, H - 0.06, z], color: z % 26 ? PALETTE.pinkLight : '#ffffff', size: 1.5 });
  add({ t: 'decor', kind: 'lightPanel', pos: [6, H - 0.06, z + 6], color: z % 26 ? '#ffffff' : PALETTE.yellow, size: 1.5 });
  add({ t: 'decor', kind: 'stripe', pos: [-W + 0.1, 3, z], yaw: Math.PI / 2, color: [PALETTE.pink, PALETTE.greenNeon, PALETTE.yellow, PALETTE.cyan][(z / 13) % 4 | 0], size: 1.5 });
}

// ---------- 1) largada
add(
  { t: 'decor', kind: 'neonSign', pos: [0, 9, -9.7], text: 'SUPER DESAFIO', color: PALETTE.yellow, size: 1.6 },
  { t: 'decor', kind: 'neonSign', pos: [0, 6.8, -9.7], text: 'DIVERTILAND', color: PALETTE.pink, size: 1 },
  { t: 'npc', character: 'guide', pos: [3, 0, -5], yaw: -2.6, anim: 'wave' },
  { t: 'checkpoint', id: 'b_cp0', pos: [-3, 0, -4] },
  { t: 'coinLine', from: [-4, 0.8, 4], to: [4, 0.8, 4], count: 5 },
  { t: 'coinLine', from: [0, 0.8, 8], to: [0, 0.8, 18], count: 6 },
  { t: 'decor', kind: 'arch', pos: [0, 0, 12], size: 1.4 },
  { t: 'decor', kind: 'balloons', pos: [-12, 0, 2] },
  { t: 'decor', kind: 'balloons', pos: [12, 0, 2] },
);
msg('b_intro', [-8, 0, -9], [8, 3, -1], 'O Super Desafio! Use tudo o que você aprendeu. Boa sorte!', '🏆', 'Abra a Porta da Memória', false);

// ---------- 2) porta da memória
add(
  { t: 'box', min: [-W, 0, 39.5], max: [-3, 12, 40.5], style: 'wall', color: '#ffd1ec' },
  { t: 'box', min: [3, 0, 39.5], max: [W, 12, 40.5], style: 'wall', color: '#ffd1ec' },
  { t: 'box', min: [-3, 5, 39.5], max: [3, 12, 40.5], style: 'wall', color: '#ffd1ec' },
  { t: 'questGate', id: 'g_mem', min: [-3, 0, 39.4], max: [3, 5, 40.6], flag: 'memDoor', color: PALETTE.purple },
  {
    t: 'friend',
    id: 'guardiao',
    name: 'Guardião da Porta',
    icon: '🤖',
    kind: 'robot',
    color: '#ffd1ec',
    accent: PALETTE.pink,
    scale: 4,
    pos: [-8, 0, 30],
    yaw: Math.PI / 2,
    intro: 'Olá! Para abrir a porta, pise nos botões na MESMA ordem em que eles acenderem. Olhe bem!',
    mission: 'Repita a sequência de luzes pisando nos botões',
    quest: { type: 'pads', group: 'mem', flag: 'memDoor', memory: true },
    thanks: 'Memória de campeão! A porta abriu!',
    hint: 'Se esquecer, fale comigo de novo que eu mostro outra vez.',
  },
  { t: 'pad', id: 'm1', group: 'mem', pos: [-4.5, 0, 33], color: PALETTE.pink, order: 0 },
  { t: 'pad', id: 'm2', group: 'mem', pos: [-1.5, 0, 33], color: PALETTE.yellow, order: 1 },
  { t: 'pad', id: 'm3', group: 'mem', pos: [1.5, 0, 33], color: PALETTE.green, order: 2 },
  { t: 'pad', id: 'm4', group: 'mem', pos: [4.5, 0, 33], color: PALETTE.cyan, order: 3 },
  { t: 'collectible', id: 'b_teddy1', pos: [-13.5, 1, 37.5] },
  { t: 'prop', kind: 'cushion', pos: [-12, 0, 36.5], color: PALETTE.green, scale: 1.8, solid: true },
);
msg('b_mem', [-8, 0, 22], [8, 3, 26], 'Fale com o Guardião (E ou ✋) para saber como abrir a porta.', '🤖', 'Fale com o Guardião', false);

// ---------- 3) torre de trampolins
add(
  { t: 'checkpoint', id: 'b_cp1', pos: [-4, 0, 43] },
  { t: 'trampoline', pos: [0, 0.4, 47.2], radius: 1.8 },
  { t: 'box', min: [-7, 0, 50], max: [7, 6, 59], color: PALETTE.pink },
  { t: 'checkpoint', id: 'b_cp2', pos: [-4.5, 6, 52] },
  { t: 'trampoline', pos: [0, 6.4, 56.8], radius: 1.6 },
  { t: 'box', min: [-7, 0, 59], max: [7, 12, 70], color: PALETTE.cyan },
  { t: 'collectible', id: 'b_teddy2', pos: [6, 13, 69] },
  { t: 'coinLine', from: [0, 3, 47.2], to: [0, 9, 47.2], count: 3 },
  { t: 'coinLine', from: [0, 9, 56.8], to: [0, 15, 56.8], count: 3 },
  // Bicho-Preguiça: escadinha lateral
  { t: 'box', min: [8, 0, 49], max: [12, 1.5, 53], color: PALETTE.yellow, onlyIn: ['sloth'] },
  { t: 'box', min: [8, 0, 53], max: [12, 3, 57], color: PALETTE.orange, onlyIn: ['sloth'] },
  { t: 'box', min: [8, 0, 57], max: [12, 4.5, 61], color: PALETTE.pink, onlyIn: ['sloth'] },
  { t: 'box', min: [6.5, 0, 52], max: [8, 6, 55], color: PALETTE.green, onlyIn: ['sloth'] },
  { t: 'box', min: [8, 0, 61], max: [12, 7.5, 64], color: PALETTE.purple, onlyIn: ['sloth'] },
  { t: 'box', min: [8, 0, 64], max: [12, 9, 67], color: PALETTE.cyan, onlyIn: ['sloth'] },
  { t: 'box', min: [8, 0, 67], max: [12, 10.5, 70], color: PALETTE.yellow, onlyIn: ['sloth'] },
  { t: 'box', min: [7, 0, 66], max: [8.5, 12, 70], color: PALETTE.green, onlyIn: ['sloth'] },
);
msg('b_tramp', [-8, 0, 41], [8, 3, 44], 'Torre de trampolins! Pule alto e vá para cima.', '🤸', 'Suba a torre de trampolins');

// ---------- 4) parkour no alto (y = 12)
const Y = 12;
add(
  { t: 'checkpoint', id: 'b_cp3', pos: [-4, Y, 64] },
  { t: 'box', min: [-1.6, 0, 70], max: [1.6, Y, 90], color: PALETTE.yellow },
  { t: 'pendulum', pivot: [0, Y + 5.2, 76], length: 4.2, axis: 'x', amplitude: 1.0, speed: 1.7, color: PALETTE.pink },
  { t: 'pendulum', pivot: [0, Y + 5.2, 84], length: 4.2, axis: 'x', amplitude: 1.0, speed: 2.1, phase: 2, color: PALETTE.orange },
  { t: 'coinLine', from: [0, Y + 0.8, 71], to: [0, Y + 0.8, 89], count: 8 },
  { t: 'box', min: [-4, 0, 90], max: [4, Y, 94], color: PALETTE.purple },
  { t: 'checkpoint', id: 'b_cp4', pos: [-2, Y, 92] },
  { t: 'vanish', pos: [0, Y, 96.6], size: [2.6, 2.6] },
  { t: 'vanish', pos: [2.4, Y, 100], size: [2.6, 2.6] },
  { t: 'vanish', pos: [0, Y, 103.4], size: [2.6, 2.6] },
  { t: 'box', min: [-4, 0, 106], max: [4, Y, 110], color: PALETTE.green },
  { t: 'checkpoint', id: 'b_cp5', pos: [-2, Y, 108] },
  { t: 'platform', pos: [0, Y, 113.5], size: [3, 3], scales: true, color: PALETTE.cyan, move: { to: [4, Y, 113.5], period: 4 } },
  { t: 'platform', pos: [0, Y, 117.5], size: [3, 3], shape: 'disc', scales: true, color: PALETTE.yellow, spin: 1 },
  { t: 'box', min: [-4, 0, 120], max: [4, Y, 124], color: PALETTE.pink },
  { t: 'collectible', id: 'b_teddy3', pos: [-4.2, Y + 1.8, 100] },
  { t: 'platform', pos: [-4.2, Y + 0.6, 100], size: [1.8, 1.8], color: PALETTE.yellow },
  { t: 'killZone', min: [-W, -2, 70], max: [W, Y - 3, 124] },
);
msg('b_parkour', [-4, Y, 90.2], [4, Y + 3, 93], 'Plataformas que somem! Pule rápido!', '💨');

// ---------- 5) escorregador gigante (y 12 → 0)
add(
  { t: 'checkpoint', id: 'b_cp6', pos: [-2.5, Y, 122] },
  { t: 'ramp', min: [-1.6, 0, 124], max: [1.6, Y, 152], axis: 'z', h0: Y, h1: 0, slide: true, rails: true, color: PALETTE.yellow },
  { t: 'coinLine', from: [0, Y - 0.6, 126], to: [0, 1.2, 150], count: 10 },
  { t: 'collectible', id: 'b_teddy4', pos: [-9, 1, 140] },
  { t: 'decor', kind: 'neonSign', pos: [0, Y + 5, 123.8], yaw: Math.PI, text: 'ESCORREGADOR GIGANTE', color: PALETTE.greenNeon, size: 0.9 },
);
msg('b_slide', [-4, Y, 120.2], [4, Y + 3, 123.8], 'Escorregador gigante! Segura que lá vem!', '🛝', 'Desça o escorregador');

// ---------- 6) corredor maluco + sala secreta
add(
  { t: 'checkpoint', id: 'b_cp7', pos: [-3, 0, 154] },
  { t: 'bumper', pos: [0, 0, 160], size: [2.6, 1.7, 1.3], axis: 'x', amplitude: 11, speed: 1.3, color: PALETTE.pink },
  { t: 'bumper', pos: [0, 0, 167], size: [2.6, 1.7, 1.3], axis: 'x', amplitude: 11, speed: 1.6, phase: 2, color: PALETTE.cyan },
  { t: 'bumper', pos: [0, 0, 174], size: [2.6, 1.7, 1.3], axis: 'x', amplitude: 11, speed: 1.9, phase: 4, color: PALETTE.orange },
  { t: 'spinner', pos: [0, 0, 182], length: 6, speed: 1.4, color: PALETTE.yellow },
  { t: 'coinLine', from: [-10, 0.8, 163.5], to: [10, 0.8, 163.5], count: 7 },
  { t: 'coinLine', from: [-10, 0.8, 170.5], to: [10, 0.8, 170.5], count: 7 },
  { t: 'coinArc', center: [0, 1.4, 182], radius: 3.5, count: 10 },
  // sala secreta atrás da cortina na parede direita da tela (x = +16)
  { t: 'curtain', min: [W - 0.2, 0, 166], max: [W + 0.2, 4.4, 176] },
  { t: 'box', min: [W, -0.5, 164], max: [W + 9, 0, 178], style: 'mat', color: '#fff2c4' },
  { t: 'box', min: [W + 9, 0, 164], max: [W + 9.5, 5, 178], style: 'wall', color: '#fff2c4' },
  { t: 'box', min: [W, 0, 163.5], max: [W + 9.5, 5, 164], style: 'wall', color: '#fff2c4' },
  { t: 'box', min: [W, 0, 178], max: [W + 9.5, 5, 178.5], style: 'wall', color: '#fff2c4' },
  { t: 'box', min: [W, 5, 163.5], max: [W + 9.5, 5.4, 178.5], style: 'wall', color: PALETTE.purple, camera: false },
  { t: 'secretZone', id: 'w1_l10_secret', min: [W + 0.6, 0, 164.5], max: [W + 8.6, 4, 177.5] },
  { t: 'collectible', id: 'b_teddy5', pos: [W + 7, 1, 171] },
  { t: 'gem', pos: [W + 4, 1, 167] },
  { t: 'gem', pos: [W + 4, 1, 175] },
  { t: 'coinArc', center: [W + 4.5, 0.9, 171], radius: 2, count: 8 },
  { t: 'decor', kind: 'balloons', pos: [W + 8, 0, 165] },
  { t: 'decor', kind: 'star', pos: [W + 4.5, 3.6, 171], color: PALETTE.yellow, size: 1.3 },
  { t: 'hintTrail', points: [[8, 1, 171], [12, 1, 171], [15, 1, 171]] },
);
msg('b_corridor', [-W, 0, 152.5], [W, 3, 156], 'Corredor maluco! Desvie dos blocos e pule a barra giratória!', '😄', 'Atravesse o corredor maluco');
msg('b_secret', [6, 0, 166], [W, 3, 176], 'Essa parede tem uma cortina colorida...', '🤔', undefined, false, 2);

// ---------- 7) o chão é lava + chegada
add(
  { t: 'box', min: [-W, -0.6, 190], max: [W, 0.1, 262], style: 'lava', surface: 'lava' },
  { t: 'box', min: [-6, 0, 186], max: [6, 1, 192], color: PALETTE.purple },
  { t: 'checkpoint', id: 'b_cp8', pos: [-3, 1, 189] },
  { t: 'platform', pos: [0, 1, 195], size: [2.2, 2.2], scales: true, color: PALETTE.pink, thick: 1.6 },
  { t: 'platform', pos: [3, 1.5, 198.5], size: [2.2, 2.2], scales: true, color: PALETTE.yellow, thick: 2 },
  { t: 'platform', pos: [0, 2, 202], size: [2.2, 2.2], scales: true, color: PALETTE.cyan, thick: 2.5 },
  { t: 'vanish', pos: [-3, 2, 205.5], size: [2.2, 2.2] },
  { t: 'vanish', pos: [0, 2, 209], size: [2.2, 2.2] },
  { t: 'box', min: [-3, 0, 211.5], max: [3, 2, 216], color: PALETTE.green },
  { t: 'checkpoint', id: 'b_cp9', pos: [-1.5, 2, 214] },
  { t: 'platform', pos: [-4, 2, 219.5], size: [3, 3], color: PALETTE.orange, move: { to: [4, 2, 219.5], period: 4.5 } },
  { t: 'box', min: [1, 0, 223], max: [7, 2, 229], color: PALETTE.purple },
  { t: 'trampoline', pos: [4, 2.4, 227.2], radius: 1.4 },
  { t: 'box', min: [-8, 0, 230], max: [8, 6, 262], color: PALETTE.purpleLight },
  { t: 'coinLine', from: [0, 2.2, 195], to: [0, 3, 209], count: 6 },
  { t: 'finish', pos: [0, 6, 240] },
  { t: 'npc', character: 'guide', pos: [3, 6, 242.5], yaw: Math.PI, anim: 'dance' },
  { t: 'decor', kind: 'neonSign', pos: [0, 14, 261.7], yaw: Math.PI, text: 'CAMPEÃO DIVERTILAND!', color: PALETTE.yellow, size: 1.3 },
  { t: 'decor', kind: 'star', pos: [-6, 11, 245], color: PALETTE.pink, size: 1.6 },
  { t: 'decor', kind: 'star', pos: [6, 12, 250], color: PALETTE.cyan, size: 1.6 },
  { t: 'decor', kind: 'balloons', pos: [-6, 6, 255] },
  { t: 'decor', kind: 'balloons', pos: [6, 6, 255] },
  // Bicho-Preguiça: degraus extras até a chegada
  { t: 'box', min: [-3, 0, 226], max: [1, 3.8, 230], color: PALETTE.yellow, onlyIn: ['sloth'] },
);
msg('b_lava', [-6, 1, 186.5], [6, 4, 191.5], 'Última parte: o chão é lava! Pule de almofada em almofada.', '🌋', 'Chegue na grande estrela!');

export const LEVEL_W1_L10: LevelLayout = {
  id: 'w1_l10',
  spawn: { pos: [0, 0, -6], yaw: 0 },
  killY: -5,
  environment: { background: '#e9dcff', fog: '#f3ecff', fogNear: 45, fogFar: 140 },
  music: 'world1',
  entities: E,
};
