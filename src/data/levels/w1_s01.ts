import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout, Vec3 } from '../../levels/exploration/LayoutTypes';

/**
 * FASE SECRETA — PEGA-PEGA SECRETO (seção 19)
 * Aberta ao achar a Sala Secreta da Fase 1. Cinco amigos de pelúcia fogem quando você
 * chega perto (IA simples): encoste em todos para vencer! Velocidade deles depende do estilo.
 */
const E: LayoutEntity[] = [];
const add = (...e: LayoutEntity[]) => E.push(...e);
const msg = (id: string, min: Vec3, max: Vec3, text: string, icon: string, mission?: string) =>
  add({ t: 'message', id, min, max, text, icon, mission, tutorial: false });
const R = 22;
const H = 12;
const AREA: [Vec3, Vec3] = [[-R + 1.2, 0, -R + 1.2], [R - 1.2, 6, R - 1.2]];

add(
  { t: 'box', min: [-R, -0.5, -R], max: [R, 0, R], style: 'mat', color: '#ffe0f0' },
  { t: 'box', min: [-R - 0.5, 0, -R], max: [-R, H, R], style: 'wall', color: '#c9b0ff' },
  { t: 'box', min: [R, 0, -R], max: [R + 0.5, H, R], style: 'wall', color: '#bfe9ff' },
  { t: 'box', min: [-R, 0, -R - 0.5], max: [R, H, -R], style: 'wall', color: '#ffe9a8' },
  { t: 'box', min: [-R, 0, R], max: [R, H, R + 0.5], style: 'wall', color: '#b8f5d2' },
  { t: 'box', min: [-R, H, -R], max: [R, H + 0.5, R], style: 'wall', color: '#8a5cff', camera: false },
  { t: 'decor', kind: 'neonSign', pos: [0, 8, R - 0.3], yaw: Math.PI, text: 'PEGA-PEGA SECRETO', color: PALETTE.pink, size: 1.2 },
  { t: 'npc', character: 'guide', pos: [2.5, 0, -R + 3], yaw: -2.6, anim: 'wave' },
);
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  add({ t: 'decor', kind: 'lightPanel', pos: [Math.sin(a) * 12, H - 0.06, Math.cos(a) * 12], color: i % 2 ? PALETTE.yellow : PALETTE.pinkLight, size: 1.4 });
}

// Obstáculos para contornar (e para os amigos se esconderem atrás)
const blocks: [number, number, number, number, number, string][] = [
  [-10, -8, 3, 1.4, 3, PALETTE.purple],
  [9, -9, 4, 1.2, 2, PALETTE.cyan],
  [-12, 8, 2, 2.2, 5, PALETTE.green],
  [11, 9, 5, 1, 3, PALETTE.orange],
  [0, 2, 3, 0.8, 3, PALETTE.yellow],
];
for (const [x, z, w, hgt, d, c] of blocks) add({ t: 'box', min: [x - w / 2, 0, z - d / 2], max: [x + w / 2, hgt, z + d / 2], color: c });
add(
  { t: 'tunnel', start: [-4, 0, 12], axis: 'x', length: 10, radius: 1.5, colors: [PALETTE.pink, PALETTE.yellow, PALETTE.cyan] },
  { t: 'box', min: [-4, 3.4, 10.3], max: [6, 4, 13.7], color: PALETTE.purple },
  { t: 'ballpit', min: [8, 0.02, -2], max: [16, 0.02, 4], depth: 0.6 },
  { t: 'trampoline', pos: [-14, 0.4, -14], radius: 1.6 },
  { t: 'platform', pos: [-16.5, 4.5, -8], size: [3, 3], color: PALETTE.pink },
  { t: 'gem', pos: [-16.5, 5.5, -8] },
  { t: 'prop', kind: 'cushion', pos: [4, 0, -12], color: PALETTE.pink, scale: 2, solid: true },
  { t: 'prop', kind: 'cushion', pos: [-6, 0, 17], color: PALETTE.cyan, scale: 2, solid: true },
  { t: 'prop', kind: 'plant', pos: [18, 0, -18], color: PALETTE.yellow, scale: 2.4 },
  { t: 'prop', kind: 'plant', pos: [-18, 0, 18], color: PALETTE.pink, scale: 2.4 },
  { t: 'coinArc', center: [0, 0.9, 0], radius: 8, count: 14 },
  { t: 'coinArc', center: [0, 0.9, 0], radius: 15, count: 18 },
  { t: 'coinLine', from: [-3, 0.8, 12], to: [5, 0.8, 12], count: 5 },
);

// Os amigos que fogem
add(
  { t: 'tagFriend', id: 'r1', kind: 'teddy', color: '#c98a52', accent: PALETTE.pink, pos: [-12, 0, -2], area: AREA },
  { t: 'tagFriend', id: 'r2', kind: 'duck', color: '#ffd60a', pos: [12, 0, -14], area: AREA, speed: 4.0 },
  { t: 'tagFriend', id: 'r3', kind: 'dino', color: '#9be27a', accent: PALETTE.yellow, pos: [14, 0, 14], area: AREA, speed: 4.6 },
  { t: 'tagFriend', id: 'r4', kind: 'robot', color: '#b9c3d6', accent: PALETTE.cyan, pos: [-14, 0, 14], area: AREA, speed: 4.2 },
  { t: 'tagFriend', id: 'r5', kind: 'teddy', color: '#ff9ccc', accent: '#ffffff', pos: [0, 0, 16], area: AREA, speed: 4.8 },
);
msg('k_intro', [-6, 0, -R], [6, 3, -R + 6], 'Pega-pega! Os amigos fogem quando você chega perto. Encoste em todos! Dica: corra e cerque eles nos cantos.', '🙌', 'Pegue os 5 amigos');

export const LEVEL_W1_S01: LevelLayout = {
  id: 'w1_s01',
  completeOn: 'allTagged',
  spawn: { pos: [0, 0, -R + 4], yaw: 0 },
  killY: -5,
  environment: { background: '#ffe9f4', fog: '#fff2f8', fogNear: 40, fogFar: 100 },
  music: 'world1',
  entities: E,
};
