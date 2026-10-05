import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout, Vec3 } from '../../levels/exploration/LayoutTypes';

/**
 * FASE 5 — CIRCUITO DAS REDES (parkour, fase normal)
 * Circuito suspenso sobre um "mar de bolinhas". Cair = voltar rapidinho ao último checkpoint.
 *  1 plataformas que andam   2 ponte dos martelos   3 plataformas que somem
 *  4 rede + ponte de rede no alto   5 discos que giram + blocos malucos   6 chegada
 * Três ursinhos dourados ficam em plataformas "de desvio" opcionais.
 */
const E: LayoutEntity[] = [];
const add = (...e: LayoutEntity[]) => E.push(...e);
const msg = (id: string, min: Vec3, max: Vec3, text: string, icon: string, mission?: string, tutorial = false) =>
  add({ t: 'message', id, min, max, text, icon, mission, tutorial });

const Y1 = 3; // altura do primeiro nível
const Y2 = 7; // altura do segundo nível

// Salão, "mar de bolinhas" lá embaixo e retorno ao checkpoint ao cair
add(
  { t: 'box', min: [-24, -0.5, -12], max: [24, 0, 160], style: 'mat', color: '#bfe9ff' },
  { t: 'ballpit', min: [-22, 0.02, -10], max: [22, 0.02, 156], depth: 0.6 },
  { t: 'killZone', min: [-30, -5, -20], max: [30, 1.4, 170] },
  { t: 'box', min: [-24.5, 0, -12], max: [-24, 16, 160], style: 'wall', color: '#c9b0ff' },
  { t: 'box', min: [24, 0, -12], max: [24.5, 16, 160], style: 'wall', color: '#c9b0ff' },
  { t: 'box', min: [-24, 0, -12.5], max: [24, 16, -12], style: 'wall', color: '#ffc6e6' },
  { t: 'box', min: [-24, 0, 160], max: [24, 16, 160.5], style: 'wall', color: '#ffc6e6' },
  { t: 'box', min: [-24, 16, -12], max: [24, 16.5, 160], style: 'wall', color: '#8a5cff', camera: false },
);
for (let z = 0; z < 160; z += 14) {
  add({ t: 'decor', kind: 'lightPanel', pos: [-6, 15.9, z], color: PALETTE.pinkLight, size: 1.4 });
  add({ t: 'decor', kind: 'lightPanel', pos: [6, 15.9, z + 7], color: '#ffffff', size: 1.4 });
  add({ t: 'decor', kind: 'stripe', pos: [-23.9, 8, z], yaw: Math.PI / 2, color: [PALETTE.greenNeon, PALETTE.pink, PALETTE.yellow][(z / 14) % 3], size: 1.6 });
  add({ t: 'decor', kind: 'stripe', pos: [23.9, 8, z + 7], yaw: Math.PI / 2, color: [PALETTE.cyan, PALETTE.orange, PALETTE.pink][(z / 14) % 3], size: 1.6 });
}
add({ t: 'decor', kind: 'neonSign', pos: [0, 12, 159.8], yaw: Math.PI, text: 'CIRCUITO DAS REDES', color: PALETTE.greenNeon, size: 1.1 });

// ---------- Largada
add(
  { t: 'box', min: [-4, 0, -8], max: [4, Y1, 8], color: PALETTE.purple },
  { t: 'checkpoint', id: 'p_cp0', pos: [-1.5, Y1, 3] },
  { t: 'decor', kind: 'arch', pos: [0, Y1, 7], size: 0.9 },
  { t: 'npc', character: 'guide', pos: [2.4, Y1, -2], yaw: -2.5, anim: 'wave' },
  { t: 'coinLine', from: [0, Y1 + 0.8, -5], to: [0, Y1 + 0.8, 6], count: 5 },
);
msg('p_start', [-4, Y1, -8], [4, Y1 + 3, 0], 'Circuito de obstáculos! Se cair nas bolinhas, você volta rapidinho!', '🏃', 'Chegue ao fim do circuito', true);

// ---------- 1) Plataformas que andam
add(
  { t: 'platform', pos: [0, Y1, 11.5], size: [3, 3], scales: true, color: PALETTE.orange, move: { to: [4, Y1, 11.5], period: 4 } },
  { t: 'platform', pos: [3, Y1, 16], size: [3, 3], scales: true, color: PALETTE.cyan, move: { to: [-2, Y1, 16], period: 5, phase: 0.3 } },
  { t: 'platform', pos: [0, Y1, 20.5], size: [3, 3], scales: true, color: PALETTE.pink, move: { to: [0, Y1 + 1.2, 20.5], period: 3.5 } },
  { t: 'coinLine', from: [0, Y1 + 1.2, 11.5], to: [0, Y1 + 1.2, 20.5], count: 4 },
  // desvio opcional com ursinho #1
  { t: 'platform', pos: [-6.5, Y1 + 0.8, 16], size: [2, 2], color: PALETTE.yellow },
  { t: 'collectible', id: 'p_teddy1', pos: [-6.5, Y1 + 2, 16] },
  { t: 'box', min: [-4, 0, 23.5], max: [4, Y1, 28], color: PALETTE.green },
  { t: 'checkpoint', id: 'p_cp_bridge', pos: [2.6, Y1, 25.5] },
);
msg('p_moving', [-4, Y1, 6], [4, Y1 + 3, 9], 'As plataformas andam! Espere ela chegar e pule!', '⏳', 'Pule nas plataformas que andam');

// ---------- 2) Ponte dos martelos
add(
  { t: 'box', min: [-1.6, 0, 28], max: [1.6, Y1, 52], color: PALETTE.yellow },
  { t: 'pendulum', pivot: [0, Y1 + 5.2, 33], length: 4.2, axis: 'x', amplitude: 1.0, speed: 1.6, color: PALETTE.pink },
  { t: 'pendulum', pivot: [0, Y1 + 5.2, 40], length: 4.2, axis: 'x', amplitude: 1.0, speed: 1.9, phase: 1.6, color: PALETTE.cyan },
  { t: 'pendulum', pivot: [0, Y1 + 5.2, 47], length: 4.2, axis: 'x', amplitude: 1.0, speed: 2.2, phase: 3.1, color: PALETTE.orange },
  { t: 'coinLine', from: [0, Y1 + 0.8, 30], to: [0, Y1 + 0.8, 50], count: 9 },
  // grades baixas dos lados no Bicho-Preguiça (menos quedas)
  { t: 'box', min: [-1.9, Y1, 28], max: [-1.6, Y1 + 0.6, 52], color: PALETTE.purpleLight, onlyIn: ['sloth'] },
  { t: 'box', min: [1.6, Y1, 28], max: [1.9, Y1 + 0.6, 52], color: PALETTE.purpleLight, onlyIn: ['sloth'] },
  { t: 'checkpoint', id: 'p_cp_mid', pos: [0, Y1, 40], onlyIn: ['sloth'] },
);
msg('p_hammers', [-4, Y1, 26], [4, Y1 + 3, 28.5], 'Martelos de espuma! Passe quando eles estiverem longe.', '🔨', 'Atravesse a ponte dos martelos');

// ---------- 3) Plataformas que somem
add(
  { t: 'box', min: [-4, 0, 52], max: [4, Y1, 58], color: PALETTE.purple },
  { t: 'checkpoint', id: 'p_cp1', pos: [-1.5, Y1, 55] },
  { t: 'vanish', pos: [0, Y1, 61], size: [2.6, 2.6], color: PALETTE.pinkLight },
  { t: 'vanish', pos: [2.6, Y1, 64.5], size: [2.6, 2.6], color: PALETTE.pinkLight },
  { t: 'vanish', pos: [0, Y1, 68], size: [2.6, 2.6], color: PALETTE.pinkLight },
  { t: 'vanish', pos: [-2.6, Y1, 71.5], size: [2.6, 2.6], color: PALETTE.pinkLight },
  { t: 'vanish', pos: [0, Y1, 75], size: [2.6, 2.6], color: PALETTE.pinkLight },
  { t: 'coin', pos: [0, Y1 + 0.9, 61] },
  { t: 'coin', pos: [2.6, Y1 + 0.9, 64.5] },
  { t: 'coin', pos: [0, Y1 + 0.9, 68] },
  { t: 'coin', pos: [-2.6, Y1 + 0.9, 71.5] },
  { t: 'coin', pos: [0, Y1 + 0.9, 75] },
  // ursinho #2 numa plataforma que some, fora do caminho
  { t: 'vanish', pos: [-5.6, Y1 + 0.6, 66], size: [2, 2], color: PALETTE.yellow },
  { t: 'collectible', id: 'p_teddy2', pos: [-5.6, Y1 + 1.8, 66] },
  { t: 'box', min: [-5, 0, 78], max: [5, Y1, 85.8], color: PALETTE.cyan },
);
msg('p_vanish', [-4, Y1, 56], [4, Y1 + 3, 58], 'Essas plataformas tremem e somem! Pule rapidinho!', '💨', 'Pule nas plataformas que somem');

// ---------- 4) Rede para subir + ponte de rede lá no alto
add(
  { t: 'box', min: [-6, 0, 86], max: [6, Y2, 92], color: PALETTE.pink },
  { t: 'net', min: [-3, Y1, 85.8], max: [3, Y2, 86], normal: [0, -1], color: PALETTE.greenNeon },
  { t: 'checkpoint', id: 'p_cp2', pos: [-3, Y2, 89] },
  { t: 'netBridge', min: [-1.4, Y2 - 0.2, 92], max: [1.4, Y2, 106], color: '#ffffff' },
  { t: 'coinLine', from: [0, Y2 + 0.8, 93], to: [0, Y2 + 0.8, 105], count: 7 },
  { t: 'spinner', pos: [0, Y2, 99], length: 1.4, speed: 2.2, color: PALETTE.orange, onlyIn: ['jaguar'] },
);
msg('p_net', [-5, Y1, 80], [5, Y1 + 3, 85.7], 'Suba pela rede verde!', '🧗', 'Suba na rede');

// ---------- 5) Discos que giram + blocos malucos
add(
  { t: 'box', min: [-5, 0, 106], max: [5, Y2, 110], color: PALETTE.purple },
  { t: 'platform', pos: [0, Y2, 113.5], size: [4.2, 4.2], shape: 'disc', scales: true, spin: 0.9, color: PALETTE.yellow },
  { t: 'platform', pos: [0, Y2, 118.6], size: [4.2, 4.2], shape: 'disc', scales: true, spin: -1.1, color: PALETTE.cyan },
  { t: 'platform', pos: [0, Y2, 123.7], size: [4.2, 4.2], shape: 'disc', scales: true, spin: 1.3, color: PALETTE.pink },
  { t: 'coinArc', center: [0, Y2 + 0.8, 118.6], radius: 1.4, count: 6 },
  { t: 'box', min: [-6, 0, 126.5], max: [6, Y2, 146], color: PALETTE.green },
  { t: 'checkpoint', id: 'p_cp3', pos: [-3.5, Y2, 128.5] },
  { t: 'bumper', pos: [0, Y2, 133], size: [2.2, 1.6, 1.2], axis: 'x', amplitude: 4, speed: 1.7, color: PALETTE.orange },
  { t: 'bumper', pos: [0, Y2, 138], size: [2.2, 1.6, 1.2], axis: 'x', amplitude: 4, speed: 2.1, phase: 2, color: PALETTE.pink },
  { t: 'pendulum', pivot: [0, Y2 + 5.2, 142], length: 4.2, axis: 'x', amplitude: 1.0, speed: 2.0, color: PALETTE.cyan },
  { t: 'coinLine', from: [-4, Y2 + 0.8, 135.5], to: [4, Y2 + 0.8, 135.5], count: 5 },
  // ursinho #3 escondido atrás de uma almofada no canto
  { t: 'box', min: [4.2, Y2, 143], max: [6, Y2 + 1.3, 144.2], color: PALETTE.yellow },
  { t: 'collectible', id: 'p_teddy3', pos: [5.1, Y2 + 0.9, 145.2] },
  { t: 'finish', pos: [0, Y2, 150] },
  { t: 'box', min: [-4, 0, 146], max: [4, Y2, 154], color: PALETTE.purple },
  { t: 'npc', character: 'guide', pos: [2.6, Y2, 152], yaw: Math.PI, anim: 'dance' },
);
msg('p_discs', [-5, Y2, 106], [5, Y2 + 3, 110], 'Discos que giram! Fique no meio para não escorregar.', '🌀', 'Atravesse os discos');
msg('p_final', [-6, Y2, 127], [6, Y2 + 3, 130], 'Última parte! Blocos malucos e martelo!', '💪', 'Chegue na estrela!');

export const LEVEL_W1_L05: LevelLayout = {
  id: 'w1_l05',
  spawn: { pos: [0, Y1, -4], yaw: 0 },
  killY: -4,
  environment: { background: '#cfe8ff', fog: '#e3f1ff', fogNear: 35, fogFar: 110 },
  music: 'world1',
  entities: E,
};
