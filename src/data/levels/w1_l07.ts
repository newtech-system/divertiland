import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout, Vec3 } from '../../levels/exploration/LayoutTypes';

/**
 * FASE 7 — TRAMPOLIM NAS ALTURAS (mecânica especial de trampolim, seção 18)
 * Uma torre: cada trampolim leva a uma plataforma mais alta, que tem outro trampolim.
 * Cada pulo seguido vai mais alto (com limite) e apertar "pular" na hora do toque dá impulso.
 * 5 ARGOLAS (alvos) para atravessar pulando e uma NUVEM SECRETA lá no alto.
 * Cair no chão do fundo devolve ao último checkpoint (sem precisar refazer tudo).
 */
const E: LayoutEntity[] = [];
const add = (...e: LayoutEntity[]) => E.push(...e);
const msg = (id: string, min: Vec3, max: Vec3, text: string, icon: string, mission?: string, tutorial = false, minHint = 0) =>
  add({ t: 'message', id, min, max, text, icon, mission, tutorial, minHint });

const H = 34;
add(
  { t: 'box', min: [-15, -0.5, -10], max: [15, 0, 32], style: 'mat', color: '#c9f5dc' },
  { t: 'box', min: [-15.5, 0, -10], max: [-15, H, 32], style: 'wall', color: '#b8f5d2' },
  { t: 'box', min: [15, 0, -10], max: [15.5, H, 32], style: 'wall', color: '#bfe9ff' },
  { t: 'box', min: [-15, 0, -10.5], max: [15, H, -10], style: 'wall', color: '#ffe9a8' },
  { t: 'box', min: [-15, 0, 32], max: [15, H, 32.5], style: 'wall', color: '#ffc6e6' },
  { t: 'box', min: [-15, H, -10], max: [15, H + 0.5, 32], style: 'wall', color: '#8a5cff', camera: false },
  // Cair no fundo (longe da largada) volta ao checkpoint
  { t: 'killZone', min: [-15, -2, 6], max: [15, 1, 32] },
  { t: 'killZone', min: [-15, -2, -10], max: [-4, 1, 6] },
  { t: 'killZone', min: [4, -2, -10], max: [15, 1, 6] },
);
for (let y = 4; y < H; y += 6) {
  add({ t: 'decor', kind: 'stripe', pos: [-14.9, y, 11], yaw: Math.PI / 2, color: [PALETTE.pink, PALETTE.greenNeon, PALETTE.yellow, PALETTE.cyan][(y / 6) % 4 | 0], size: 5 });
  add({ t: 'decor', kind: 'stripe', pos: [14.9, y + 3, 11], yaw: Math.PI / 2, color: [PALETTE.cyan, PALETTE.orange, PALETTE.pink, PALETTE.green][(y / 6) % 4 | 0], size: 5 });
  add({ t: 'decor', kind: 'star', pos: [((y * 7) % 20) - 10, y + 2, 30], color: [PALETTE.yellow, PALETTE.pink, PALETTE.cyan][(y / 6) % 3 | 0], size: 1.2 });
}
add({ t: 'decor', kind: 'neonSign', pos: [0, 30, 31.8], yaw: Math.PI, text: 'TRAMPOLIM NAS ALTURAS', color: PALETTE.yellow, size: 1.1 });

// ---------- chão: largada + trampolim 1
add(
  { t: 'box', min: [-4, 0, -10], max: [4, 0.3, 6], color: PALETTE.purpleLight },
  { t: 'checkpoint', id: 't_cp0', pos: [-2.5, 0.3, -5] },
  { t: 'npc', character: 'guide', pos: [2.5, 0.3, -4], yaw: -2.6, anim: 'wave' },
  { t: 'trampoline', pos: [-0.8, 0.6, 3.8], radius: 1.8 },
  { t: 'collectible', id: 't_ring1', pos: [-0.8, 5.2, 3.8], look: 'ring' },
  { t: 'collectible', id: 't_ring2', pos: [-0.8, 9.6, 3.8], look: 'ring' },
  { t: 'coinLine', from: [-0.8, 3, 3.8], to: [-0.8, 8, 3.8], count: 3 },
);
msg('t_bounce', [-4, 0, -9], [4, 3, -3], 'Pule no trampolim várias vezes: cada pulo vai mais alto!', '🤸', 'Suba a torre de trampolins', true);
msg('t_timing', [-4, 0, -2], [4, 3, 0.5], 'Dica: aperte PULAR bem na hora que encostar no trampolim!', '⏱️', undefined, true);
msg('t_rings', [-2.8, 3.5, 2], [1.2, 6, 6], 'Passe por dentro das argolas verdes!', '🎯');

// ---------- plataforma 1 (altura 6)
add(
  { t: 'box', min: [-10, 0, 6], max: [-3, 6, 13], color: PALETTE.pink },
  { t: 'checkpoint', id: 't_cp1', pos: [-8.5, 6, 8] },
  { t: 'trampoline', pos: [-4.7, 6.4, 11.4], radius: 1.6 },
  { t: 'collectible', id: 't_ring3', pos: [-4.7, 12.6, 11.4], look: 'ring' },
  { t: 'coinLine', from: [-4.7, 9, 11.4], to: [-4.7, 15, 11.4], count: 3 },
  { t: 'prop', kind: 'balloon', pos: [-9.3, 6, 12.3], color: PALETTE.yellow, scale: 1.4 },
);
msg('t_p1', [-10, 6, 6], [-3, 9, 13], 'Isso! Agora o próximo trampolim!', '⬆️', 'Chegue mais alto');

// ---------- plataforma 2 (altura 12)
add(
  { t: 'box', min: [-3, 0, 14], max: [4, 12, 20.5], color: PALETTE.cyan },
  { t: 'checkpoint', id: 't_cp2', pos: [2.8, 12, 15] },
  { t: 'trampoline', pos: [2.2, 12.4, 18.6], radius: 1.6 },
  { t: 'coinLine', from: [2.2, 15, 18.6], to: [2.2, 21, 18.6], count: 3 },
  { t: 'prop', kind: 'present', pos: [-2.2, 12, 19.6], color: PALETTE.pink, scale: 1.4 },
);

// ---------- nuvem secreta (só no pulo máximo do trampolim da plataforma 2)
add(
  { t: 'platform', pos: [-1.6, 21.6, 18.6], size: [3.2, 3.2], shape: 'disc', color: '#ffffff' },
  { t: 'prop', kind: 'cushion', pos: [-2.4, 21.6, 19.3], color: '#ffffff', scale: 0.9 },
  { t: 'prop', kind: 'cushion', pos: [-0.9, 21.6, 17.9], color: '#f3ecff', scale: 0.8 },
  { t: 'secretZone', id: 'w1_l07_secret', min: [-3.2, 21.6, 17], max: [0, 24, 20.2] },
  { t: 'gem', pos: [-1.6, 22.6, 18.6] },
  { t: 'gem', pos: [-2.3, 23.4, 18.6] },
  { t: 'gem', pos: [-0.9, 23.4, 18.6] },
  { t: 'hintTrail', points: [[2.2, 16, 18.6], [0.8, 19, 18.6], [-0.6, 21.8, 18.6]] },
);
msg('t_cloud', [-3, 12, 14], [4, 15, 20.5], 'Psiu... tem uma nuvem lá no alto. Pule bem alto!', '☁️', undefined, false, 2);

// ---------- plataforma 3 (altura 18)
add(
  { t: 'box', min: [4.5, 0, 20.5], max: [11, 18, 27.5], color: PALETTE.orange },
  { t: 'checkpoint', id: 't_cp3', pos: [9.5, 18, 22] },
  { t: 'trampoline', pos: [6.3, 18.4, 25], radius: 1.6 },
  { t: 'collectible', id: 't_ring4', pos: [6.3, 24.5, 25], look: 'ring' },
  { t: 'collectible', id: 't_ring5', pos: [6.3, 27.8, 25], look: 'ring' },
  { t: 'coinLine', from: [6.3, 21, 25], to: [6.3, 26, 25], count: 2 },
);

// ---------- topo (altura 24) + chegada
add(
  { t: 'box', min: [-5, 0, 22.5], max: [3.5, 24, 31.5], color: PALETTE.purple },
  { t: 'finish', pos: [-1, 24, 27] },
  { t: 'npc', character: 'guide', pos: [1.6, 24, 29.5], yaw: Math.PI, anim: 'dance' },
  { t: 'decor', kind: 'balloons', pos: [-4, 24, 30.5] },
  { t: 'decor', kind: 'balloons', pos: [2.5, 24, 30.5] },
);
msg('t_top', [4.5, 18, 20.5], [11, 21, 27.5], 'Último trampolim! Lá em cima está a estrela!', '⭐', 'Chegue na estrela do topo');

export const LEVEL_W1_L07: LevelLayout = {
  id: 'w1_l07',
  spawn: { pos: [0, 0.3, -7], yaw: 0 },
  killY: -4,
  environment: { background: '#d6f7e6', fog: '#e8fbf1', fogNear: 40, fogFar: 120 },
  music: 'world1',
  entities: E,
};
