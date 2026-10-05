import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout, Vec3 } from '../../levels/exploration/LayoutTypes';

/**
 * FASE 9 — O URSINHO PERDIDO (aventura narrativa longa — seção 16)
 * A Mamãe Ursa perdeu o filhote. A criança conversa com os amigos da Divertiland,
 * AJUDA cada um com um probleminha (empatia!) e recebe pistas. Pegadas 🐾 marcam o caminho.
 *  Oeste: Dino Fofo perdeu 3 balões          → missão de buscar
 *  Leste: Robô Beto ficou sem luz            → pisar em 4 botões
 *  Norte: Pato Quack perdeu 3 patinhos       → buscar escondidos (abre a Sala das Almofadas)
 *  Fundo: Sala das Almofadas → o Ursinho Fofo está lá!
 * Os caminhos podem ser feitos em qualquer ordem (tomada de decisão).
 */
const E: LayoutEntity[] = [];
const add = (...e: LayoutEntity[]) => E.push(...e);
const msg = (id: string, min: Vec3, max: Vec3, text: string, icon: string, mission?: string, tutorial = false, minHint = 0) =>
  add({ t: 'message', id, min, max, text, icon, mission, tutorial, minHint });
const W = '#e2d2ff';
const H = 10;
const wallX = (x: number, z0: number, z1: number, color = W) => add({ t: 'box', min: [x - 0.25, 0, z0], max: [x + 0.25, H, z1], style: 'wall', color });
const wallZ = (z: number, x0: number, x1: number, color = W) => add({ t: 'box', min: [x0, 0, z - 0.25], max: [x1, H, z + 0.25], style: 'wall', color });

// ---------- estrutura
add(
  { t: 'box', min: [-34, -0.5, -10], max: [34, 0, 64], style: 'mat', color: '#f6e9ff' },
  { t: 'box', min: [-34, H, -10], max: [34, H + 0.5, 64], style: 'wall', color: '#8a5cff', camera: false },
);
wallZ(-10, -34, 34);
wallZ(64, -34, 34);
wallX(34, -10, 64);
wallX(-34, -10, 21);
wallX(-34, 27, 64);
add({ t: 'box', min: [-34.25, 3.6, 21], max: [-33.75, H, 27], style: 'wall', color: W });
// Sala das Almofadas separada por parede com portão (abre pela missão do Pato)
wallZ(46, -34, -3, '#ffd1ec');
wallZ(46, 3, 34, '#ffd1ec');
add({ t: 'box', min: [-3, 4.2, 45.75], max: [3, H, 46.25], style: 'wall', color: '#ffd1ec' });
add({ t: 'questGate', id: 'g_pillow', min: [-3, 0, 45.6], max: [3, 4.2, 46.4], flag: 'pillowRoom', color: PALETTE.pink });
for (let z = -4; z < 64; z += 12) {
  add({ t: 'decor', kind: 'lightPanel', pos: [-14, H - 0.06, z], color: PALETTE.pinkLight, size: 1.3 });
  add({ t: 'decor', kind: 'lightPanel', pos: [14, H - 0.06, z + 6], color: '#ffffff', size: 1.3 });
}
add({ t: 'decor', kind: 'neonSign', pos: [0, 7, -9.7], text: 'O URSINHO PERDIDO', color: PALETTE.pink, size: 1 });

// ---------- praça central: a Mamãe Ursa
add(
  { t: 'npc', character: 'guide', pos: [3, 0, -4], yaw: -2.6, anim: 'idle' },
  {
    t: 'friend',
    id: 'mama',
    name: 'Mamãe Ursa',
    icon: '🐻',
    kind: 'teddy',
    color: '#ff9ccc',
    accent: '#ffffff',
    scale: 4.2,
    pos: [0, 0, 8],
    yaw: Math.PI,
    intro: 'Buá! Meu filhote, o Ursinho Fofo, se perdeu! Pergunte aos amigos da Divertiland, eles podem ter visto ele. Siga as pegadas!',
    thanks: 'Os amigos vão ajudar você. Obrigada!',
    hint: 'Siga as pegadas 🐾 e ajude os amigos. Eles sabem onde o Ursinho Fofo está!',
  },
  { t: 'decor', kind: 'arch', pos: [0, 0, 1.5], size: 1.1 },
  { t: 'prop', kind: 'plant', pos: [-5, 0, 3], color: PALETTE.pink, scale: 2 },
  { t: 'prop', kind: 'plant', pos: [5, 0, 3], color: PALETTE.yellow, scale: 2 },
  { t: 'checkpoint', id: 'u_cp0', pos: [-3, 0, -3] },
  { t: 'sign', pos: [-9, 2.4, 6], yaw: Math.PI / 2, text: 'Dino Fofo ➡️', color: PALETTE.green, w: 2.6, h: 0.9 },
  { t: 'sign', pos: [9, 2.4, 6], yaw: -Math.PI / 2, text: '⬅️ Robô Beto', color: PALETTE.cyan, w: 2.6, h: 0.9 },
  { t: 'sign', pos: [4.5, 2.4, 18], yaw: Math.PI, text: '⬆️ Pato Quack', color: PALETTE.yellow, w: 2.6, h: 0.9 },
  { t: 'collectible', id: 'u_paw1', pos: [-7, 0.02, 9], look: 'paw' },
  { t: 'collectible', id: 'u_paw2', pos: [9, 0.02, 11], look: 'paw' },
  { t: 'collectible', id: 'u_paw3', pos: [0, 0.02, 22], look: 'paw' },
);
msg('u_intro', [-6, 0, -9], [6, 3, -1], 'Alguém está chorando... vamos ver quem é? Chegue perto e aperte E (ou ✋) para conversar.', '💬', 'Fale com a Mamãe Ursa', true);

// ---------- oeste: Dino Fofo e os balões
add(
  {
    t: 'friend',
    id: 'dino',
    name: 'Dino Fofo',
    icon: '🦖',
    kind: 'dino',
    color: '#9be27a',
    accent: PALETTE.yellow,
    scale: 3.4,
    pos: [-22, 0, 10],
    yaw: 0,
    intro: 'Oi! Meus 3 balões voaram para longe! Você me ajuda a pegar de volta?',
    mission: 'Pegue os 3 balões do Dino',
    quest: { type: 'collect', group: 'balloons', count: 3, flag: 'helpedDino' },
    thanks: 'Meus balões! Obrigado, amigo!',
    hint: 'Eu vi o Ursinho Fofo passando... ele foi na direção do Pato Quack, lá no lago!',
  },
  { t: 'questItem', id: 'b1', group: 'balloons', kind: 'balloon', icon: '🎈', pos: [-17, 0, 0], color: PALETTE.pink, scale: 1.6 },
  { t: 'box', min: [-31, 0, 13], max: [-26, 1.2, 17], color: PALETTE.yellow },
  { t: 'box', min: [-31, 0, 17], max: [-26, 2.4, 21], color: PALETTE.orange },
  { t: 'questItem', id: 'b2', group: 'balloons', kind: 'balloon', icon: '🎈', pos: [-28.5, 2.4, 19], color: PALETTE.cyan, scale: 1.6 },
  { t: 'trampoline', pos: [-27, 0.4, 3], radius: 1.5 },
  { t: 'questItem', id: 'b3', group: 'balloons', kind: 'balloon', icon: '🎈', pos: [-27, 4.6, 3], color: PALETTE.yellow, scale: 1.6 },
  { t: 'collectible', id: 'u_paw4', pos: [-14, 0.02, 4], look: 'paw' },
  { t: 'prop', kind: 'cushion', pos: [-20, 0, 18], color: PALETTE.green, scale: 1.5, solid: true },
  { t: 'prop', kind: 'stack', pos: [-16, 0, 16], color: PALETTE.pink, scale: 2 },
  { t: 'decor', kind: 'balloons', pos: [-31, 0, 0] },
  // esconderijo secreto atrás da cortina na parede oeste
  { t: 'curtain', min: [-34.2, 0, 21], max: [-33.8, 3.6, 27] },
  { t: 'box', min: [-42, -0.5, 19], max: [-34, 0, 29], style: 'mat', color: '#ffe9a8' },
  { t: 'box', min: [-42.5, 0, 19], max: [-42, 5, 29], style: 'wall', color: '#fff2c4' },
  { t: 'box', min: [-42, 0, 18.5], max: [-34, 5, 19], style: 'wall', color: '#fff2c4' },
  { t: 'box', min: [-42, 0, 29], max: [-34, 5, 29.5], style: 'wall', color: '#fff2c4' },
  { t: 'box', min: [-42.5, 5, 18.5], max: [-33.8, 5.4, 29.5], style: 'wall', color: PALETTE.purple, camera: false },
  { t: 'secretZone', id: 'w1_l09_secret', min: [-41.5, 0, 19.5], max: [-34.5, 4, 28.5] },
  { t: 'gem', pos: [-38, 1, 22] },
  { t: 'gem', pos: [-38, 1, 26] },
  { t: 'coinArc', center: [-38, 0.9, 24], radius: 1.5, count: 8 },
  { t: 'prop', kind: 'present', pos: [-40.5, 0, 24], color: PALETTE.pink, scale: 2 },
  { t: 'hintTrail', points: [[-30, 1, 22], [-32, 1, 23.5], [-33.5, 1, 24]] },
);
msg('u_dino_hint', [-34, 0, 19], [-26, 3, 27], 'Essa cortina colorida... será que dá para passar?', '🤔', undefined, false, 2);

// ---------- leste: Robô Beto e as luzes
add(
  {
    t: 'friend',
    id: 'robo',
    name: 'Robô Beto',
    icon: '🤖',
    kind: 'robot',
    color: '#b9c3d6',
    accent: PALETTE.cyan,
    scale: 3.6,
    pos: [24, 0, 10],
    yaw: 0,
    intro: 'Bip-bop! Minhas luzes apagaram. Pise nos 4 botões redondos para religar, por favor!',
    mission: 'Pise nos 4 botões de luz',
    quest: { type: 'pads', group: 'lights', flag: 'helpedRobo' },
    thanks: 'Bip! Luzes ligadas! Muito obrigado!',
    hint: 'Minhas câmeras viram o Ursinho Fofo indo para o lago do Pato Quack!',
  },
  { t: 'pad', id: 'l1', group: 'lights', pos: [18, 0, 2], color: PALETTE.yellow },
  { t: 'pad', id: 'l2', group: 'lights', pos: [29, 0, 3], color: PALETTE.pink },
  { t: 'pad', id: 'l3', group: 'lights', pos: [29, 0, 18], color: PALETTE.cyan },
  { t: 'pad', id: 'l4', group: 'lights', pos: [18, 0, 19], color: PALETTE.green },
  { t: 'collectible', id: 'u_paw5', pos: [15, 0.02, 14], look: 'paw' },
  { t: 'prop', kind: 'lamp', pos: [31, 0, 10], color: PALETTE.cyan, accent: PALETTE.purple, scale: 2.4 },
  { t: 'prop', kind: 'toybox', pos: [22, 0, 22], color: PALETTE.purple, accent: PALETTE.yellow, scale: 1.4, solid: true },
);

// ---------- norte: Pato Quack e os patinhos
add(
  { t: 'box', min: [-7, 0, 30], max: [7, 0.06, 40], style: 'glass', color: '#9fe8ff' },
  {
    t: 'friend',
    id: 'pato',
    name: 'Pato Quack',
    icon: '🦆',
    kind: 'duck',
    color: '#ffd60a',
    scale: 5,
    pos: [-9, 0, 28],
    yaw: Math.PI / 2,
    intro: 'Quack! Meus 3 patinhos foram brincar de esconde-esconde e eu não acho! Pode procurar?',
    mission: 'Ache os 3 patinhos escondidos',
    quest: { type: 'collect', group: 'ducklings', count: 3, flag: 'pillowRoom' },
    thanks: 'Quack quack! Meus patinhos! Obrigado!',
    hint: 'O Ursinho Fofo está na Sala das Almofadas! Eu abri a porta rosa para você!',
  },
  { t: 'questItem', id: 'd1', group: 'ducklings', kind: 'duck', icon: '🐤', pos: [-15, 0, 42], color: '#ffd60a', scale: 1.4 },
  { t: 'prop', kind: 'cushion', pos: [-13.6, 0, 41], color: PALETTE.purple, scale: 1.6, solid: true },
  { t: 'questItem', id: 'd2', group: 'ducklings', kind: 'duck', icon: '🐤', pos: [14.5, 0, 42.5], color: '#ffd60a', scale: 1.4 },
  { t: 'prop', kind: 'toybox', pos: [13, 0, 41], color: PALETTE.orange, accent: PALETTE.pink, scale: 1.3, solid: true },
  { t: 'platform', pos: [3, 1, 36], size: [2.4, 2.4], shape: 'disc', color: PALETTE.green },
  { t: 'questItem', id: 'd3', group: 'ducklings', kind: 'duck', icon: '🐤', pos: [3, 1, 36], color: '#ffd60a', scale: 1.4 },
  { t: 'prop', kind: 'plant', pos: [8.5, 0, 31], color: PALETTE.cyan, scale: 2.2 },
  { t: 'prop', kind: 'plant', pos: [-8.5, 0, 38], color: PALETTE.pink, scale: 2.2 },
  { t: 'checkpoint', id: 'u_cp1', pos: [5, 0, 26] },
);

// ---------- Sala das Almofadas: o Ursinho Fofo
add(
  { t: 'ballpit', min: [-12, 0.02, 50], max: [-4, 0.02, 60], depth: 0.6 },
  { t: 'prop', kind: 'cushion', pos: [6, 0, 50], color: PALETTE.yellow, scale: 2, solid: true },
  { t: 'prop', kind: 'cushion', pos: [8, 0, 54], color: PALETTE.cyan, scale: 2, solid: true },
  { t: 'prop', kind: 'cushion', pos: [8, 1.1, 54], color: PALETTE.pink, scale: 1.6 },
  { t: 'prop', kind: 'cushion', pos: [-2, 0, 61], color: PALETTE.green, scale: 2, solid: true },
  {
    t: 'friend',
    id: 'baby',
    name: 'Ursinho Fofo',
    icon: '🧸',
    kind: 'teddy',
    color: '#c98a52',
    accent: PALETTE.pink,
    scale: 2.2,
    pos: [0, 0, 56],
    yaw: Math.PI,
    intro: 'Snif... eu me perdi brincando nas almofadas...',
    thanks: 'Você me achou! Vou voltar para a Mamãe Ursa. Muito obrigado! 💛',
    finishesLevel: true,
    needsFlag: 'pillowRoom',
  },
  { t: 'decor', kind: 'neonSign', pos: [0, 6.5, 63.7], yaw: Math.PI, text: 'SALA DAS ALMOFADAS', color: PALETTE.pink, size: 0.8 },
  { t: 'decor', kind: 'balloons', pos: [-3, 0, 62] },
  { t: 'decor', kind: 'balloons', pos: [3, 0, 62] },
);
msg('u_room', [-6, 0, 46.5], [6, 3, 50], 'Olha lá! É o Ursinho Fofo! Vá falar com ele.', '🧸', 'Fale com o Ursinho Fofo', false);

export const LEVEL_W1_L09: LevelLayout = {
  id: 'w1_l09',
  spawn: { pos: [0, 0, -6], yaw: 0 },
  killY: -5,
  environment: { background: '#efe2ff', fog: '#f6efff', fogNear: 40, fogFar: 110 },
  music: 'world1',
  entities: E,
};
