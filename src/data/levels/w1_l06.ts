import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout } from '../../levels/exploration/LayoutTypes';

/**
 * FASE 6 — CAÇA AOS DIVERTIS (plataforma 2D, fase normal — seção 14)
 * Vista de lado, muda totalmente o ritmo. Correr, pular, blocos surpresa "?", plataformas,
 * trampolins, um muro alto com SALA SECRETA em cima e 3 ursinhos dourados.
 * O personagem anda só em X (profundidade fixa em z = 0).
 */
const E: LayoutEntity[] = [];
const add = (...e: LayoutEntity[]) => E.push(...e);
const D = 1.6; // meia profundidade das plataformas
const COLORS = [PALETTE.purple, PALETTE.pink, PALETTE.cyan, PALETTE.green, PALETTE.orange];
let ci = 0;
const ground = (x0: number, x1: number, y = 0) => add({ t: 'box', min: [x0, y - 3, -D], max: [x1, y, D], color: COLORS[ci++ % COLORS.length] });
const plat = (x: number, y: number, w = 3) => add({ t: 'box', min: [x - w / 2, y - 0.5, -D], max: [x + w / 2, y, D], color: COLORS[ci++ % COLORS.length] });
const coins = (x0: number, x1: number, y: number, n?: number) => add({ t: 'coinLine', from: [x0, y, 0], to: [x1, y, 0], count: n ?? Math.max(2, Math.round((x1 - x0) / 1.4)) });
const arc = (x: number, y: number, w = 3) => {
  for (let i = 0; i < 5; i++) add({ t: 'coin', pos: [x - w / 2 + (i / 4) * w, y + Math.sin((i / 4) * Math.PI) * 1.4, 0] });
};
const msg = (id: string, x0: number, x1: number, y: number, text: string, icon: string, mission?: string, tutorial = false, minHint = 0) =>
  add({ t: 'message', id, min: [x0, y - 1, -3], max: [x1, y + 4, 3], text, icon, mission, tutorial, minHint });

// ---------- fundo (cenário de trás) e queda
add(
  { t: 'box', min: [-12, -6, -9], max: [250, 26, -8.5], style: 'wall', color: '#d9c6ff', camera: false },
  { t: 'killZone', min: [-20, -12, -10], max: [260, -1, 10] },
  { t: 'ballpit', min: [-10, -2.6, -2.5], max: [245, -2.6, 2.5], depth: 0.5 },
);
for (let x = 0, i = 0; x < 240; x += 26, i++) {
  add({ t: 'decor', kind: 'neonSign', pos: [x + 8, 12 + (i % 2) * 3, -8.3], text: ['DIVERTILAND', 'CAÇA AOS DIVERTIS', 'PULA!', 'UHUUL!', 'SEGREDO?', 'CORRE!'][i % 6], color: [PALETTE.pink, PALETTE.green, PALETTE.yellow, PALETTE.cyan][i % 4], size: 1 });
  add({ t: 'decor', kind: 'balloons', pos: [x + 18, 6, -6] });
  add({ t: 'decor', kind: 'star', pos: [x + 2, 17, -7], color: [PALETTE.yellow, PALETTE.pink, PALETTE.cyan][i % 3], size: 1.6 });
  add({ t: 'decor', kind: 'pillar', pos: [x + 13, -3, -6.5], color: COLORS[i % COLORS.length], size: 3.5 });
}

// ---------- A: aprender (andar, pular, bloco surpresa)
ground(-8, 20);
add({ t: 'npc', character: 'guide', pos: [-4, 0, -1], yaw: 0.6, anim: 'wave' });
coins(3, 11, 1);
add({ t: 'bumpBlock', pos: [8, 3.4, 0] });
add({ t: 'box', min: [14, 0, -D], max: [16, 1, D], color: PALETTE.yellow }, { t: 'box', min: [16, 0, -D], max: [18, 2, D], color: PALETTE.orange });
ground(18, 26, 2);
arc(27.5, 3.2, 3);
ground(29, 44);
add({ t: 'checkpoint', id: 's_cp1', pos: [31, 0, 0] });
msg('s_move', -8, 2, 0, 'Fase de lado! ⬅️ ➡️ para andar e ⬆️ ou ESPAÇO para pular!', '🎮', 'Chegue ao fim e pegue muitos Divertis!', true);
msg('s_block', 5, 8, 0, 'Bloco com "?": pule embaixo dele e bata a cabeça!', '❓', undefined, true);

// ---------- B: subir, trampolim e o grande buraco
plat(46.5, 1.6, 3);
plat(51, 3.2, 3);
plat(55.5, 4.6, 3);
coins(46, 56, 5.8, 6);
ground(58, 66, 5);
add({ t: 'trampoline', pos: [60.5, 5.4, 0], radius: 1.2 });
plat(64.5, 8.6, 2.6);
add({ t: 'collectible', id: 's_teddy1', pos: [64.5, 9.8, 0] });
add({ t: 'platform', pos: [68.5, 4.5, 0], size: [3, 3], color: PALETTE.pink, move: { to: [77.5, 4.5, 0], period: 5 } });
coins(69, 77, 5.6, 5);
ground(80, 96, 3);
add({ t: 'checkpoint', id: 's_cp2', pos: [82.5, 3, 0] });
msg('s_moving', 62, 66, 5, 'Espere a plataforma rosa chegar e pule nela!', '⏳', 'Atravesse o buraco grande');
msg('s_tramp1', 58, 60, 5, 'Trampolim! Pule várias vezes para pegar o ursinho lá em cima!', '🧸', undefined, false, 2);

// ---------- C: o muro alto (e o segredo em cima dele)
add({ t: 'trampoline', pos: [92.5, 3.4, 0], radius: 1.3 });
add({ t: 'box', min: [96, 0, -D], max: [98, 9, D], color: PALETTE.purple });
// Sala secreta FLUTUANDO acima do muro: só o pulo mais alto do trampolim alcança.
// Quem pula normal passa por baixo dela e cai do outro lado do muro.
add({ t: 'box', min: [99, 12.2, -D], max: [104, 12.6, D], color: PALETTE.yellow });
add({ t: 'curtain', min: [104, 12.6, -D], max: [104.3, 15.8, D] });
add(
  { t: 'box', min: [104, 12.2, -D], max: [111, 12.6, D], color: PALETTE.pink },
  { t: 'box', min: [104, 16, -D], max: [111, 16.4, D], style: 'wall', color: PALETTE.purple, camera: false },
  { t: 'secretZone', id: 'w1_l06_secret', min: [105, 12.6, -2], max: [110.8, 15.8, 2] },
  { t: 'gem', pos: [106.5, 13.6, 0] },
  { t: 'gem', pos: [108.5, 13.6, 0] },
  { t: 'collectible', id: 's_teddy2', pos: [110.2, 13.8, 0] },
  { t: 'decor', kind: 'neonSign', pos: [107.5, 15.1, -1.7], text: 'SALA SECRETA', color: PALETTE.pink, size: 0.45 },
);
coins(92.5, 92.5, 6, 1);
coins(92.5, 92.5, 8, 1);
ground(98, 122, 3);
add({ t: 'checkpoint', id: 's_cp3', pos: [100.5, 3, 0] });
msg('s_wall', 86, 90, 3, 'Muro alto! Use o trampolim para passar por cima!', '🧱', 'Pule por cima do muro');
msg('s_secret_hint', 98, 100, 3, 'Será que tem algo em cima do muro?', '🤔', undefined, false, 2);

// ---------- D: obstáculos (blocos malucos e martelo) + blocos surpresa
add(
  { t: 'bumper', pos: [127, 3, 0], size: [1.4, 1.1, 2.4], axis: 'x', amplitude: 3, speed: 1.6, color: PALETTE.orange },
  { t: 'pendulum', pivot: [137, 8.4, 0], length: 4.2, axis: 'x', amplitude: 1.0, speed: 1.8, color: PALETTE.cyan },
  { t: 'bumpBlock', pos: [145, 6.4, 0] },
  { t: 'bumpBlock', pos: [148, 6.4, 0] },
  { t: 'bumper', pos: [154, 3, 0], size: [1.4, 1.1, 2.4], axis: 'x', amplitude: 3, speed: 2, phase: 1.5, color: PALETTE.pink },
);
plat(149.5, 8.6, 2.4);
add({ t: 'collectible', id: 's_teddy3', pos: [149.5, 9.8, 0] });
coins(122, 160, 4, 14);
ground(122, 168, 3);
add({ t: 'checkpoint', id: 's_cp4', pos: [161, 3, 0] });
msg('s_bumpers', 118, 121, 3, 'Pule por cima dos blocos malucos e passe pelo martelo na hora certa!', '🔨', 'Passe pelos obstáculos');
msg('s_teddy3', 141, 144, 3, 'Suba nos blocos "?" para alcançar o ursinho!', '🧸', undefined, false, 2);

// ---------- E: plataformas que somem sobre o buraco
add(
  { t: 'vanish', pos: [171.5, 3, 0], size: [2.4, 3.2] },
  { t: 'vanish', pos: [175.5, 3.8, 0], size: [2.4, 3.2] },
  { t: 'vanish', pos: [179.5, 4.6, 0], size: [2.4, 3.2] },
  { t: 'vanish', pos: [183.5, 3.8, 0], size: [2.4, 3.2] },
  { t: 'vanish', pos: [187.5, 3, 0], size: [2.4, 3.2] },
);
arc(175.5, 5, 2);
arc(183.5, 5, 2);
ground(190.5, 214, 3);
add({ t: 'checkpoint', id: 's_cp5', pos: [193, 3, 0] });
msg('s_vanish', 164, 168, 3, 'Essas plataformas somem! Não pare em cima delas!', '💨');

// ---------- F: escadinha e chegada
add(
  { t: 'box', min: [204, 3, -D], max: [207, 4.2, D], color: PALETTE.yellow },
  { t: 'box', min: [207, 3, -D], max: [210, 5.4, D], color: PALETTE.green },
  { t: 'box', min: [210, 3, -D], max: [230, 6.6, D], color: PALETTE.purple },
  { t: 'finish', pos: [218, 6.6, 0] },
  { t: 'npc', character: 'guide', pos: [222, 6.6, -1], yaw: -0.6, anim: 'dance' },
);
coins(196, 203, 4, 5);

export const LEVEL_W1_L06: LevelLayout = {
  id: 'w1_l06',
  view: 'side',
  spawn: { pos: [-6, 0, 0], yaw: Math.PI / 2 },
  killY: -6,
  environment: { background: '#e6d8ff', fog: '#efe6ff', fogNear: 40, fogFar: 120 },
  music: 'world1',
  entities: E,
};
