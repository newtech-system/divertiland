import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout, Vec3 } from '../../levels/exploration/LayoutTypes';

/**
 * FASE 1 — BEM-VINDO À DIVERTILAND (exploração 3D + tutorial, fase principal)
 *
 * Roteiro (seção 40):
 *  A Entrada (z -8..10)         andar, olhar para trás (ursinho #1)
 *  B Corredor (z 10..30)        primeiras moedas, câmera, nicho com gema
 *  C Blocos (z 30..40)          aprender a pular
 *  D Túnel (z 40..54)           túnel colorido
 *  E Blocos malucos (z 54..80)  obstáculos móveis + barra giratória (ursinho #2 no alto)
 *  F Rede e ponte (z 80..110)   escalar, ponte de rede, piscina de bolinhas (ursinho #3)
 *  G Escolha (z 110..134)       plataformas  OU  caminho tranquilo com botão + SALA SECRETA
 *  H Escorregador (z 134..156)
 *  I Trampolins (z 156..190)    pular cada vez mais alto até a CHEGADA
 *
 * Eixo: o personagem começa olhando para +Z. "Esquerda" do jogador = +X.
 * Todo o cenário é PLACEHOLDER: blocos coloridos no lugar dos brinquedos reais.
 */

const E: LayoutEntity[] = [];
const add = (...e: LayoutEntity[]) => E.push(...e);

const WALL = '#d8c4ff';
const WALL2 = '#ffc6e6';
const H = 14; // altura do teto

/** Parede ao longo de Z num X fixo. */
function wallX(x: number, z0: number, z1: number, y0 = 0, y1 = H, color = WALL, t = 0.5) {
  add({ t: 'box', min: [x - t / 2, y0, z0], max: [x + t / 2, y1, z1], style: 'wall', color });
}
/** Parede ao longo de X num Z fixo. */
function wallZ(z: number, x0: number, x1: number, y0 = 0, y1 = H, color = WALL, t = 0.5) {
  add({ t: 'box', min: [x0, y0, z - t / 2], max: [x1, y1, z + t / 2], style: 'wall', color });
}
function floor(x0: number, x1: number, z0: number, z1: number, y = 0, colors?: string) {
  add({ t: 'box', min: [x0, y - 0.5, z0], max: [x1, y, z1], style: 'mat', color: colors });
}
function msg(
  id: string,
  min: Vec3,
  max: Vec3,
  text: string,
  opts: { icon?: string; mission?: string; tutorial?: boolean; minHint?: number } = {},
) {
  add({ t: 'message', id, min, max, text, ...opts });
}

// ============================================================ ESTRUTURA GERAL
// Piso térreo (sem a área da piscina de bolinhas, que tem fundo próprio)
floor(-16, 16, -8, 90, 0);
floor(-16, 16, 102, 190, 0, '#ffd1ec');
// Paredes externas e teto
wallX(-16, -8, 190);
wallX(16, -8, 190);
wallZ(-8, -16, 16);
wallZ(190, -16, 16);
add({ t: 'box', min: [-16, H, -8], max: [16, H + 0.5, 190], style: 'wall', color: '#8a5cff', camera: false });
for (let z = 0; z < 190; z += 12) {
  add({ t: 'decor', kind: 'lightPanel', pos: [-4, H - 0.06, z], color: z % 24 ? PALETTE.pinkLight : '#ffffff', size: 1.2 });
  add({ t: 'decor', kind: 'lightPanel', pos: [4, H - 0.06, z + 6], color: z % 24 ? '#ffffff' : PALETTE.cyan, size: 1.2 });
}

// ============================================================ A — ENTRADA
wallX(-8, -8, 10, 0, H, WALL);
wallX(8, -8, 10, 0, H, WALL);
wallZ(10, -8, -3.5, 0, H, WALL2);
wallZ(10, 3.5, 8, 0, H, WALL2);
add(
  { t: 'decor', kind: 'neonSign', pos: [0, 7.5, -7.7], text: 'DIVERTILAND', color: PALETTE.pink, size: 1.3 },
  { t: 'decor', kind: 'neonSign', pos: [0, 5.7, -7.7], text: 'o mundo da diversão', color: PALETTE.cyan, size: 0.6 },
  { t: 'decor', kind: 'arch', pos: [0, 0, 6], size: 1.2 },
  { t: 'decor', kind: 'neonSign', pos: [0, 4.6, 9.7], yaw: Math.PI, text: 'BEM-VINDO!', color: PALETTE.yellow, size: 0.8 },
  { t: 'decor', kind: 'stripe', pos: [-7.7, 3, 1], yaw: Math.PI / 2, color: PALETTE.greenNeon, size: 2 },
  { t: 'decor', kind: 'stripe', pos: [7.7, 3, 1], yaw: Math.PI / 2, color: PALETTE.pink, size: 2 },
  { t: 'decor', kind: 'stripe', pos: [-7.7, 3.4, 1], yaw: Math.PI / 2, color: PALETTE.yellow, size: 2 },
  { t: 'decor', kind: 'stripe', pos: [7.7, 3.4, 1], yaw: Math.PI / 2, color: PALETTE.cyan, size: 2 },
  { t: 'decor', kind: 'pillar', pos: [-6.5, 0, -6.2], color: PALETTE.pink, size: 1.6 },
  { t: 'decor', kind: 'pillar', pos: [6.5, 0, -6.2], color: PALETTE.green, size: 1.6 },
  { t: 'decor', kind: 'balloons', pos: [-6.4, 0, 8.2] },
  { t: 'decor', kind: 'balloons', pos: [6.4, 0, 8.2] },
  { t: 'decor', kind: 'cushion', pos: [-6.2, 0, 2], color: PALETTE.yellow },
  { t: 'decor', kind: 'cushion', pos: [6.2, 0, 3.5], color: PALETTE.cyan },
  { t: 'decor', kind: 'cushion', pos: [6.2, 0.6, 3.5], color: PALETTE.pink, size: 0.8 },
  { t: 'npc', character: 'guide', pos: [2.6, 0, 1.5], yaw: -2.6, anim: 'wave' },
  // Ursinho dourado #1: atrás do pilar, para quem olha em volta
  { t: 'collectible', id: 'teddy_1', pos: [-7, 1, -7] },
  { t: 'coinLine', from: [-4, 0.8, -6.5], to: [-6, 0.8, -6.5], count: 3 },
);
msg('m_move', [-6, 0, -6], [6, 3, 3], 'Use as setas, WASD ou o joystick para andar!', {
  icon: '🕹️',
  mission: 'Explore a Divertiland!',
  tutorial: true,
});

// ============================================================ B — CORREDOR
wallX(-3.5, 10, 30, 0, H, PALETTE.purpleLight);
wallX(3.5, 10, 20, 0, H, PALETTE.purpleLight);
wallX(3.5, 24, 30, 0, H, PALETTE.purpleLight);
// Nicho lateral com gema (recompensa a curiosidade)
wallX(7.5, 19.75, 24.25, 0, H, WALL2);
wallZ(20, 3.5, 7.5, 0, H, WALL2);
wallZ(24, 3.5, 7.5, 0, H, WALL2);
add(
  { t: 'gem', pos: [5.8, 1, 22] },
  { t: 'decor', kind: 'star', pos: [6.6, 3, 22], color: PALETTE.yellow },
  { t: 'decor', kind: 'stripe', pos: [-3.2, 1.2, 20], yaw: Math.PI / 2, color: PALETTE.greenNeon, size: 2.4 },
  { t: 'decor', kind: 'stripe', pos: [3.2, 1.2, 15], yaw: Math.PI / 2, color: PALETTE.pink, size: 1.2 },
  { t: 'decor', kind: 'stripe', pos: [3.2, 1.2, 27], yaw: Math.PI / 2, color: PALETTE.pink, size: 0.6 },
  { t: 'decor', kind: 'ring', pos: [0, 3.4, 14], color: PALETTE.yellow },
  { t: 'decor', kind: 'ring', pos: [0, 3.4, 26], color: PALETTE.greenNeon },
);
for (let i = 0; i < 12; i++) add({ t: 'coin', pos: [Math.sin(i * 0.9) * 1.8, 0.8, 11 + i * 1.5] });
msg('m_coins', [-3.5, 0, 9.5], [3.5, 3, 12], 'Pegue os Divertis! Cada moeda é sua!', { icon: '🪙', tutorial: true });
msg('m_camera', [-3.5, 0, 15], [3.5, 3, 17], 'Arraste na tela ou com o mouse para olhar em volta!', { icon: '👀', tutorial: true });
msg('m_alcove', [-3.5, 0, 18.5], [3.5, 3, 20], 'Psiu... tem alguma coisa brilhando aqui do lado!', { icon: '✨', minHint: 2 });

// ============================================================ C — BLOCOS DE PULO
wallZ(30, -6, -3.5, 0, H, WALL2);
wallZ(30, 3.5, 6, 0, H, WALL2);
wallX(-6, 30, 54, 0, H, WALL);
wallX(6, 30, 54, 0, H, WALL);
add(
  { t: 'box', min: [-6, 0, 33], max: [6, 0.8, 34.6], color: PALETTE.orange },
  { t: 'box', min: [-6, 0, 37], max: [6, 1.3, 38.8], color: PALETTE.green },
  { t: 'coinLine', from: [-2, 1.6, 33.8], to: [2, 1.6, 33.8], count: 3 },
  { t: 'coinLine', from: [-2, 2.1, 37.9], to: [2, 2.1, 37.9], count: 3 },
  { t: 'gem', pos: [-4.8, 2.4, 37.9] },
  { t: 'decor', kind: 'balloons', pos: [4.8, 1.3, 38] },
);
msg('m_jump', [-6, 0, 30.2], [6, 3, 32.4], 'Aperte ESPAÇO ou o botão de pulo para pular!', {
  icon: '⬆️',
  mission: 'Pule os blocos',
  tutorial: true,
});

// ============================================================ D — TÚNEL
add(
  { t: 'box', min: [-6, 0, 40], max: [-1.75, 5, 54], color: PALETTE.purple },
  { t: 'box', min: [1.75, 0, 40], max: [6, 5, 54], color: PALETTE.pink },
  { t: 'box', min: [-1.75, 3.6, 40], max: [1.75, 5, 54], color: PALETTE.yellow },
  { t: 'tunnel', start: [0, 0, 40], axis: 'z', length: 14, radius: 1.6, colors: [PALETTE.pink, PALETTE.yellow, PALETTE.cyan, PALETTE.greenNeon, PALETTE.purple] },
  { t: 'coinLine', from: [0, 0.7, 41.5], to: [0, 0.7, 52.5], count: 8 },
  { t: 'cameraZone', min: [-1.6, 0, 39.5], max: [1.6, 3, 54.5], distance: 3.2, pitch: 0.12 },
  { t: 'decor', kind: 'neonSign', pos: [0, 4.2, 39.9], yaw: Math.PI, text: 'TÚNEL MALUCO', color: PALETTE.greenNeon, size: 0.55 },
);
msg('m_tunnel', [-6, 0, 39], [6, 3, 40.5], 'Entre no túnel colorido!', { icon: '🌀', mission: 'Atravesse o túnel' });

// ============================================================ E — BLOCOS MALUCOS
wallZ(54, -9, -6, 0, H, WALL);
wallZ(54, 6, 9, 0, H, WALL);
wallX(-9, 54, 124, 0, H, WALL);
wallX(-9, 128, 156, 0, H, WALL);
wallX(-9, 124, 128, 7, H, WALL); // acima da cortina secreta
wallX(9, 54, 156, 0, H, WALL);
add(
  { t: 'checkpoint', id: 'cp1', pos: [-2.5, 0, 56.5] },
  { t: 'bumper', pos: [0, 0, 61], size: [2.4, 1.7, 1.3], axis: 'x', amplitude: 5.5, speed: 1.4, color: PALETTE.pink },
  { t: 'bumper', pos: [0, 0, 66], size: [2.4, 1.7, 1.3], axis: 'x', amplitude: 5.5, speed: 1.8, phase: 2, color: PALETTE.cyan },
  { t: 'bumper', pos: [0, 0, 71], size: [2.4, 1.7, 1.3], axis: 'x', amplitude: 5.5, speed: 2.2, phase: 4, color: PALETTE.orange },
  { t: 'checkpoint', id: 'cp1b', pos: [-7.5, 0, 68.5], onlyIn: ['sloth'] },
  { t: 'coinLine', from: [-6, 0.8, 63.5], to: [6, 0.8, 63.5], count: 5 },
  { t: 'coinLine', from: [-6, 0.8, 68.5], to: [6, 0.8, 68.5], count: 5 },
  { t: 'spinner', pos: [0, 0, 76.5], length: 4.2, speed: 1.6, color: PALETTE.orange },
  { t: 'coinArc', center: [0, 1.4, 76.5], radius: 2.6, count: 8 },
  // Pilha de almofadas com o ursinho #2 lá no alto
  { t: 'box', min: [5.5, 0, 72.5], max: [8.8, 0.7, 75.5], color: PALETTE.yellow },
  { t: 'box', min: [6.6, 0, 75.5], max: [8.8, 1.4, 77.5], color: PALETTE.green },
  { t: 'box', min: [6.6, 0, 77.5], max: [8.8, 2.3, 80], color: PALETTE.purple },
  { t: 'collectible', id: 'teddy_2', pos: [7.7, 3.3, 78.8] },
  { t: 'decor', kind: 'neonSign', pos: [8.7, 6, 66], yaw: -Math.PI / 2, text: 'BLOCOS MALUCOS', color: PALETTE.orange, size: 0.7 },
  { t: 'decor', kind: 'balloons', pos: [-8, 0, 78] },
);
msg('m_bumpers', [-9, 0, 55], [9, 3, 58], 'Desvie dos blocos malucos! Se encostar, eles te empurram!', {
  icon: '😄',
  mission: 'Passe pelos blocos malucos',
});
msg('m_spinner', [-9, 0, 72.5], [5, 3, 74], 'Pule a barra giratória!', { icon: '🌀' });
msg('m_teddy2', [3, 0, 69], [9, 3, 72.4], 'Um ursinho dourado lá no alto das almofadas!', { icon: '🧸', minHint: 2 });

// ============================================================ F — REDE, PONTE E PISCINA DE BOLINHAS
add(
  // Plataforma alta 1 (a frente dela é a rede)
  { t: 'box', min: [-9, 0, 84], max: [9, 4, 90], color: PALETTE.purple },
  { t: 'net', min: [-3, 0, 83.8], max: [3, 4, 84], normal: [0, -1], color: PALETTE.greenNeon },
  { t: 'checkpoint', id: 'cp2', pos: [-2.2, 4, 87] },
  // Ponte de rede
  { t: 'netBridge', min: [-1.5, 3.8, 90], max: [1.5, 4, 102], color: '#ffffff' },
  { t: 'coinLine', from: [0, 4.7, 91], to: [0, 4.7, 101], count: 8 },
  // Piscina de bolinhas embaixo (cair é divertido, não é castigo!)
  { t: 'ballpit', min: [-9, 0.02, 90], max: [9, 0.02, 102], depth: 0.75 },
  { t: 'gem', pos: [-5, 1.2, 96] },
  { t: 'gem', pos: [5, 1.2, 96] },
  { t: 'collectible', id: 'teddy_3', pos: [7.8, 1.2, 91.2] },
  // Plataforma alta 2 (rede na frente para subir de volta)
  { t: 'box', min: [-9, 0, 102], max: [9, 4, 110], color: PALETTE.pink },
  { t: 'net', min: [-3, 0, 101.8], max: [3, 4, 102], normal: [0, -1], color: PALETTE.yellow },
  { t: 'decor', kind: 'neonSign', pos: [0, 7.5, 83.6], yaw: Math.PI, text: 'CIRCUITO DAS REDES', color: PALETTE.greenNeon, size: 0.7 },
  { t: 'decor', kind: 'ring', pos: [0, 7, 96], color: PALETTE.pink, size: 1.5 },
);
msg('m_net', [-9, 0, 80.5], [9, 3, 83.7], 'Ande até a rede e continue andando para escalar!', {
  icon: '🧗',
  mission: 'Suba na rede',
  tutorial: true,
});
msg('m_bridge', [-9, 4, 87.5], [9, 7, 90], 'Atravesse a ponte! Se cair, é piscina de bolinhas!', {
  icon: '🎉',
  mission: 'Atravesse a ponte de rede',
});
msg('m_pit', [-9, 0, 90], [9, 1.5, 102], 'Piscina de bolinhas! Suba pela rede amarela da frente!', {
  icon: '🧗',
  mission: 'Suba pela rede amarela',
});

// ============================================================ G — ESCOLHA DE CAMINHO
add(
  { t: 'checkpoint', id: 'cp3', pos: [0, 4, 106] },
  { t: 'sign', pos: [5.5, 6, 109.7], yaw: Math.PI, text: '⬅️ Plataformas', color: PALETTE.orange, w: 3, h: 1 },
  { t: 'sign', pos: [-6.5, 6, 109.7], yaw: Math.PI, text: 'Tranquilo ➡️', color: PALETTE.green, w: 3, h: 1 },
  // Divisória entre os caminhos
  { t: 'box', min: [-4, 0, 110], max: [2.6, 7.5, 134], color: PALETTE.purpleLight },
  { t: 'decor', kind: 'neonSign', pos: [-0.7, 9, 110.1], yaw: Math.PI, text: 'ESCOLHA!', color: PALETTE.yellow, size: 0.8 },
  // --- Caminho tranquilo (direita do jogador = -X): passarela com botão e portão
  { t: 'box', min: [-9, 0, 110], max: [-4, 4, 134], color: PALETTE.green },
  { t: 'button', id: 'btn_gate', pos: [-5.4, 4, 115.4], target: 'gate_1' },
  { t: 'gate', id: 'gate_1', min: [-9, 4, 117.8], max: [-4, 7.5, 118.4], color: PALETTE.orange },
  { t: 'coinLine', from: [-6.5, 4.8, 120], to: [-6.5, 4.8, 132], count: 7 },
  { t: 'curtain', min: [-9.2, 4, 124], max: [-8.8, 7, 128] },
  // Sala secreta
  { t: 'box', min: [-15, 0, 121], max: [-9, 4, 131], color: PALETTE.yellow },
  { t: 'box', min: [-15.5, 4, 121], max: [-15, 9, 131], style: 'wall', color: PALETTE.pinkLight },
  { t: 'box', min: [-15, 4, 120.5], max: [-9, 9, 121], style: 'wall', color: PALETTE.pinkLight },
  { t: 'box', min: [-15, 4, 131], max: [-9, 9, 131.5], style: 'wall', color: PALETTE.pinkLight },
  { t: 'box', min: [-15, 9, 120.5], max: [-9, 9.4, 131.5], style: 'wall', color: PALETTE.purple, camera: false },
  { t: 'secretZone', id: 'w1_l01_secret_room', min: [-14.5, 4, 121.5], max: [-9.6, 8, 130.5] },
  { t: 'decor', kind: 'neonSign', pos: [-14.8, 7.3, 126], yaw: Math.PI / 2, text: 'SALA SECRETA', color: PALETTE.pink, size: 0.6 },
  { t: 'coinArc', center: [-12, 4.8, 126], radius: 2, count: 10 },
  { t: 'gem', pos: [-12, 5, 126] },
  { t: 'gem', pos: [-14, 5, 122.5] },
  { t: 'gem', pos: [-14, 5, 129.5] },
  { t: 'decor', kind: 'balloons', pos: [-10, 4, 122] },
  { t: 'decor', kind: 'balloons', pos: [-10, 4, 130] },
  { t: 'decor', kind: 'star', pos: [-12, 7.6, 126], color: PALETTE.yellow, size: 1.3 },
  { t: 'hintTrail', points: [[-6, 4.5, 121], [-7.5, 4.5, 123.5], [-8.6, 4.5, 125.5], [-10, 4.5, 126]] },
  // --- Caminho das plataformas (esquerda do jogador = +X), sobre um fosso
  { t: 'killZone', min: [2.6, -1, 110], max: [9, 2.6, 134] },
  { t: 'platform', pos: [6, 4, 112.4], size: [2.4, 2.4], scales: true, color: PALETTE.orange },
  { t: 'platform', pos: [4.8, 4, 115.5], size: [2.2, 2.2], scales: true, color: PALETTE.cyan },
  { t: 'platform', pos: [5, 4, 119.5], size: [2.2, 2.2], scales: true, color: PALETTE.pink, move: { to: [7.6, 4, 119.5], period: 4 } },
  { t: 'platform', pos: [6, 4, 123], size: [3.2, 3.2], shape: 'disc', scales: true, color: PALETTE.yellow, spin: 0.8 },
  { t: 'platform', pos: [5, 4.6, 126.5], size: [2.2, 2.2], scales: true, color: PALETTE.green },
  { t: 'platform', pos: [7, 4, 129.5], size: [2.4, 2.4], scales: true, color: PALETTE.purple },
  { t: 'platform', pos: [5.4, 4, 132.4], size: [2.4, 2.4], scales: true, color: PALETTE.pink },
  { t: 'coinLine', from: [6, 4.9, 111.8], to: [6, 4.9, 113], count: 2 },
  { t: 'coinLine', from: [4.8, 4.9, 114.9], to: [4.8, 4.9, 116.1], count: 2 },
  { t: 'coinLine', from: [5, 5.4, 119.5], to: [7.6, 5.4, 119.5], count: 3 },
  { t: 'gem', pos: [6, 5, 123] },
  { t: 'coinLine', from: [5, 5.6, 126], to: [5, 5.6, 127], count: 2 },
  { t: 'gem', pos: [7, 5, 129.5] },
  { t: 'coinLine', from: [5.4, 4.9, 131.8], to: [5.4, 4.9, 133], count: 2 },
  // Rota especial do Jaguar: plataforma alta com gemas
  { t: 'platform', pos: [8, 6.4, 125.4], size: [1.6, 1.6], color: PALETTE.yellow, onlyIn: ['jaguar'] },
  { t: 'gem', pos: [8, 7.4, 125.4], onlyIn: ['jaguar'] },
  { t: 'gem', pos: [8, 8.4, 125.4], onlyIn: ['jaguar'] },
);
msg('m_choice', [-9, 4, 103], [9, 7, 108], 'Escolha um caminho: plataformas ou caminho tranquilo!', {
  icon: '🤔',
  mission: 'Escolha um caminho',
});
msg('m_button', [-9, 4, 111], [-4, 7, 113.5], 'Aperte o botão vermelho para abrir a porta! (E ou ✋)', {
  icon: '🔴',
  mission: 'Aperte o botão',
  tutorial: true,
});
msg('m_curtain', [-9, 4, 120.5], [-4, 7, 123], 'Hmm... essa cortina colorida parece diferente!', { icon: '🤔', minHint: 2 });
msg('m_plats', [2.6, 4, 110], [9, 7, 111.5], 'Pule de plataforma em plataforma!', { icon: '🦘', mission: 'Pule nas plataformas' });

// ============================================================ H — ESCORREGADOR
add(
  { t: 'box', min: [-9, 0, 134], max: [9, 4, 140], color: PALETTE.cyan },
  { t: 'checkpoint', id: 'cp4', pos: [-4, 4, 137] },
  { t: 'box', min: [-9, 4, 139.6], max: [-1.75, 5.1, 140], color: PALETTE.pink },
  { t: 'box', min: [1.75, 4, 139.6], max: [9, 5.1, 140], color: PALETTE.pink },
  { t: 'ramp', min: [-1.5, 0, 140], max: [1.5, 4, 156], axis: 'z', h0: 4, h1: 0, slide: true, rails: true, color: PALETTE.yellow },
  { t: 'coinLine', from: [0, 4.2, 142], to: [0, 1.2, 153], count: 6 },
  { t: 'decor', kind: 'neonSign', pos: [0, 8, 139.7], yaw: Math.PI, text: 'ESCORREGADOR', color: PALETTE.pink, size: 0.75 },
  { t: 'decor', kind: 'cushion', pos: [5, 0, 150], color: PALETTE.green },
);
msg('m_slide', [-9, 4, 135], [9, 7, 139], 'Hora do escorregador! Wiii!', { icon: '🛝', mission: 'Desça o escorregador' });

// ============================================================ I — TRAMPOLINS E CHEGADA
wallZ(156, -12, -9, 0, H, WALL);
wallZ(156, 9, 12, 0, H, WALL);
wallX(-12, 156, 190, 0, H, WALL2);
wallX(12, 156, 190, 0, H, WALL2);
add(
  { t: 'checkpoint', id: 'cp5', pos: [-3, 0, 158.5] },
  { t: 'trampoline', pos: [-5, 0.4, 164], radius: 1.5 },
  { t: 'trampoline', pos: [0, 0.4, 172.4], radius: 1.8 },
  { t: 'trampoline', pos: [5, 0.4, 164], radius: 1.5 },
  { t: 'coinLine', from: [-5, 3, 164], to: [-5, 9, 164], count: 4 },
  { t: 'coinLine', from: [0, 3.5, 172.4], to: [0, 9.5, 172.4], count: 4 },
  { t: 'gem', pos: [5, 8, 164] },
  { t: 'gem', pos: [5, 10, 164] },
  // Plataforma da chegada
  { t: 'box', min: [-6, 0, 175], max: [6, 7, 190], color: PALETTE.purple },
  { t: 'finish', pos: [0, 7, 182] },
  { t: 'npc', character: 'guide', pos: [3, 7, 183.5], yaw: Math.PI, anim: 'dance' },
  { t: 'decor', kind: 'neonSign', pos: [0, 11.5, 189.7], yaw: Math.PI, text: 'VOCÊ CONSEGUIU!', color: PALETTE.yellow, size: 1 },
  { t: 'decor', kind: 'star', pos: [-8, 9, 172], color: PALETTE.pink, size: 1.4 },
  { t: 'decor', kind: 'star', pos: [8, 10, 178], color: PALETTE.yellow, size: 1.4 },
  { t: 'decor', kind: 'star', pos: [-9, 6, 184], color: PALETTE.cyan, size: 1.2 },
  { t: 'decor', kind: 'balloons', pos: [-5, 7, 188] },
  { t: 'decor', kind: 'balloons', pos: [5, 7, 188] },
  { t: 'decor', kind: 'ring', pos: [0, 11, 174], color: PALETTE.greenNeon, size: 1.6 },
  // Escadinha extra só no Bicho-Preguiça (ninguém fica preso)
  { t: 'box', min: [-11.5, 0, 160], max: [-8, 1.2, 164], color: PALETTE.green, onlyIn: ['sloth'] },
  { t: 'box', min: [-11.5, 0, 164], max: [-8, 2.4, 167], color: PALETTE.yellow, onlyIn: ['sloth'] },
  { t: 'box', min: [-11.5, 0, 167], max: [-8, 3.6, 170], color: PALETTE.pink, onlyIn: ['sloth'] },
  { t: 'box', min: [-11.5, 0, 170], max: [-8, 4.8, 173], color: PALETTE.cyan, onlyIn: ['sloth'] },
  { t: 'box', min: [-11.5, 0, 173], max: [-6, 6, 176.5], color: PALETTE.orange, onlyIn: ['sloth'] },
);
msg('m_tramp', [-12, 0, 157], [12, 3, 160.5], 'Pule no trampolim várias vezes para ir cada vez mais alto!', {
  icon: '🤸',
  mission: 'Suba até a estrela!',
  tutorial: true,
});
msg('m_stairs', [-12, 0, 160.5], [-6, 3, 163], 'Também dá para subir pela escadinha colorida!', { icon: '🪜', minHint: 2 });

export const LEVEL_W1_L01: LevelLayout = {
  id: 'w1_l01',
  spawn: { pos: [0, 0, -3], yaw: 0 },
  killY: -6,
  environment: { background: '#cdb6ff', fog: '#e7dbff', fogNear: 30, fogFar: 95 },
  music: 'world1',
  entities: E,
};
