import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout, Vec3 } from '../../levels/exploration/LayoutTypes';

/**
 * FASE 8 — O CHÃO É LAVA! (parkour especial, seção 15)
 * A sala de estar da Divertiland virou "lava" de geleia neon. Só vale pisar em móveis,
 * almofadas, mesas, prateleiras, tapete voador e brinquedos. Tocar no chão = volta ao
 * checkpoint na hora (rapidinho, sem castigo).
 */
const E: LayoutEntity[] = [];
const add = (...e: LayoutEntity[]) => E.push(...e);
const msg = (id: string, min: Vec3, max: Vec3, text: string, icon: string, mission?: string, tutorial = false, minHint = 0) =>
  add({ t: 'message', id, min, max, text, icon, mission, tutorial, minHint });
const H = 12;

// Sala + chão de lava
add(
  { t: 'box', min: [-14, -0.6, -8], max: [14, 0.1, 86], style: 'lava', surface: 'lava' },
  { t: 'box', min: [-14.5, 0, -8], max: [-14, H, 86], style: 'wall', color: '#ffe0f0' },
  { t: 'box', min: [14, 0, -8], max: [14.5, H, 86], style: 'wall', color: '#e0f0ff' },
  { t: 'box', min: [-14, 0, -8.5], max: [14, H, -8], style: 'wall', color: '#fff2c4' },
  { t: 'box', min: [-14, 0, 86], max: [14, H, 86.5], style: 'wall', color: '#e9dcff' },
  { t: 'box', min: [-14, H, -8], max: [14, H + 0.5, 86], style: 'wall', color: '#8a5cff', camera: false },
  { t: 'decor', kind: 'neonSign', pos: [0, 8.5, -7.7], text: 'O CHÃO É LAVA!', color: PALETTE.orange, size: 1.2 },
);
for (let z = 0; z < 86; z += 12) {
  add({ t: 'decor', kind: 'lightPanel', pos: [0, H - 0.06, z], color: z % 24 ? PALETTE.yellow : '#ffffff', size: 1.3 });
  add({ t: 'decor', kind: 'stripe', pos: [-13.9, 6, z], yaw: Math.PI / 2, color: PALETTE.pink, size: 1.4 });
  add({ t: 'decor', kind: 'stripe', pos: [13.9, 6, z + 6], yaw: Math.PI / 2, color: PALETTE.cyan, size: 1.4 });
}

// ---------- Largada: tapete/sofá grande
add(
  { t: 'box', min: [-5, 0, -8], max: [5, 1, 3], color: PALETTE.purple },
  { t: 'box', min: [-5, 1, -8], max: [5, 2.4, -6.6], color: PALETTE.purpleLight },
  { t: 'checkpoint', id: 'l_cp0', pos: [-3, 1, -2] },
  { t: 'npc', character: 'guide', pos: [3, 1, -3], yaw: -2.6, anim: 'wave' },
  { t: 'prop', kind: 'cushion', pos: [-3.6, 1, -5.8], color: PALETTE.yellow, scale: 1.2 },
  { t: 'prop', kind: 'cushion', pos: [3.6, 1, -5.8], color: PALETTE.cyan, scale: 1.2 },
);
msg('l_intro', [-5, 1, -7], [5, 4, 0], 'O chão virou lava! Só pise nos móveis e nas almofadas!', '🌋', 'Atravesse sem pisar no chão', true);

// ---------- Almofadas (pedras de pular)
const cushions: [number, number, string][] = [[-1.5, 5.6, PALETTE.pink], [1.8, 8.6, PALETTE.yellow], [-1, 11.8, PALETTE.green], [2.2, 15, PALETTE.cyan], [-0.5, 18.2, PALETTE.orange]];
for (const [x, z, c] of cushions) {
  add({ t: 'platform', pos: [x, 0.9, z], size: [1.9, 1.9], scales: true, color: c, thick: 1.4 });
  add({ t: 'coin', pos: [x, 1.8, z] });
}
add({ t: 'checkpoint', id: 'l_cp_s1', pos: [2.2, 0.9, 15], onlyIn: ['sloth'] });

// ---------- Mesa de centro + ursinho #1 em cima do abajur
add(
  { t: 'box', min: [-3, 0, 20.5], max: [3, 1.4, 26], color: PALETTE.yellow },
  { t: 'checkpoint', id: 'l_cp1', pos: [-1.5, 1.4, 23] },
  { t: 'prop', kind: 'present', pos: [1.6, 1.4, 21.6], color: PALETTE.pink },
  { t: 'prop', kind: 'book', pos: [0.4, 1.4, 24.8], color: PALETTE.cyan, scale: 1.6 },
  { t: 'box', min: [5, 0, 21], max: [6.4, 3.2, 22.4], color: PALETTE.pink },
  { t: 'box', min: [4.6, 0, 23.6], max: [6.6, 1.9, 25.6], color: PALETTE.purpleLight },
  { t: 'collectible', id: 'l_teddy1', pos: [5.7, 4.2, 21.7] },
);
msg('l_teddy1', [-3, 1.4, 20.5], [3, 4, 26], 'Tem um ursinho em cima do banquinho alto! Suba pelo puff roxo.', '🧸', undefined, false, 2);

// ---------- Cadeiras em zigue-zague
const chairs: [number, number][] = [[-2.5, 28.8], [1.5, 31.8], [-2, 34.8]];
chairs.forEach(([x, z], i) => {
  add({ t: 'platform', pos: [x, 1.2, z], size: [1.6, 1.6], scales: true, color: [PALETTE.green, PALETTE.cyan, PALETTE.orange][i], thick: 1.2 });
  add({ t: 'coin', pos: [x, 2, z] });
});

// ---------- Prateleira comprida na parede (andar com cuidado)
add(
  { t: 'box', min: [-4.5, 0, 37.5], max: [-1, 1.8, 40], color: PALETTE.purple },
  { t: 'checkpoint', id: 'l_cp2', pos: [-2.8, 1.8, 38.8] },
  { t: 'box', min: [-13.8, 0, 38], max: [-11.4, 2.6, 40], color: PALETTE.pink },
  { t: 'box', min: [-13.8, 2.6, 40], max: [-12.2, 2.9, 55], color: PALETTE.yellow },
  { t: 'box', min: [-13.8, 2.9, 40], max: [-13.6, 5, 55], color: PALETTE.orange },
  { t: 'coinLine', from: [-13, 3.7, 41], to: [-13, 3.7, 54], count: 7 },
  { t: 'prop', kind: 'book', pos: [-13.1, 2.9, 47], color: PALETTE.green, rotY: 0.6, scale: 1.4 },
  { t: 'box', min: [-9.2, 0, 38.5], max: [-6.8, 1.5, 40.4], color: PALETTE.cyan },
  { t: 'box', min: [-13.8, 0, 55], max: [-10, 2.2, 58.5], color: PALETTE.green },
  { t: 'collectible', id: 'l_teddy2', pos: [-13, 3.9, 54.2] },
);
msg('l_shelf', [-9.2, 1.5, 37.5], [-1, 4, 40.5], 'Suba no puff e na estante! Ande pela prateleira amarela.', '📚', 'Ande pela prateleira');

// ---------- Tapete voador (plataforma que anda) + almofadas que somem
add(
  { t: 'platform', pos: [-9, 2.2, 61], size: [2.8, 2.8], color: PALETTE.pink, move: { to: [-1, 2.2, 61], period: 5 } },
  { t: 'coinLine', from: [-8, 3, 61], to: [-2, 3, 61], count: 4 },
  { t: 'box', min: [1, 0, 59.5], max: [4.5, 2.2, 63], color: PALETTE.purple },
  { t: 'checkpoint', id: 'l_cp3', pos: [2.7, 2.2, 61.2] },
  { t: 'vanish', pos: [5.8, 2.2, 65], size: [2, 2], color: PALETTE.yellow },
  { t: 'vanish', pos: [3.2, 2.2, 68], size: [2, 2], color: PALETTE.yellow },
  { t: 'vanish', pos: [5.8, 2.2, 71], size: [2, 2], color: PALETTE.yellow },
  { t: 'coin', pos: [5.8, 3, 65] },
  { t: 'coin', pos: [3.2, 3, 68] },
  { t: 'coin', pos: [5.8, 3, 71] },
);
msg('l_carpet', [-13.8, 2.2, 55], [-10, 5, 58.5], 'Um tapete voador! Pule nele quando chegar perto.', '🧞', 'Pegue o tapete voador');

// ---------- Bola pula-pula (trampolim) até a estante da saída
add(
  { t: 'box', min: [2.5, 0, 73], max: [8.5, 2.2, 77], color: PALETTE.cyan },
  { t: 'trampoline', pos: [5.5, 2.6, 75], radius: 1.4 },
  { t: 'box', min: [-6, 0, 78], max: [8.5, 6, 86], color: PALETTE.purpleLight },
  // Escadinha extra só no Bicho-Preguiça
  { t: 'box', min: [-1, 0, 73.5], max: [2.5, 3.4, 77], color: PALETTE.yellow, onlyIn: ['sloth'] },
  { t: 'box', min: [-4, 0, 75], max: [-1, 4.6, 78], color: PALETTE.green, onlyIn: ['sloth'] },
  { t: 'collectible', id: 'l_teddy3', pos: [-11.5, 5.2, 80] },
  { t: 'box', min: [-13.8, 0, 78.5], max: [-9.5, 4.2, 81.5], color: PALETTE.orange },
  { t: 'platform', pos: [-7.7, 5, 80], size: [1.6, 1.6], color: PALETTE.pink },
  { t: 'finish', pos: [1.5, 6, 82] },
  { t: 'npc', character: 'guide', pos: [5.5, 6, 83.5], yaw: Math.PI, anim: 'dance' },
);
msg('l_tramp', [2.5, 2.2, 73], [8.5, 5, 77], 'Pule no pula-pula para subir na estante da saída!', '🤸', 'Suba na estante da saída');

export const LEVEL_W1_L08: LevelLayout = {
  id: 'w1_l08',
  spawn: { pos: [0, 1, -4], yaw: 0 },
  killY: -3,
  environment: { background: '#ffe2d1', fog: '#fff0e6', fogNear: 30, fogFar: 100 },
  music: 'world1',
  entities: E,
};
