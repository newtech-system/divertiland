import { PALETTE } from '../../engine/materials';
import type { LayoutEntity, LevelLayout, Vec3 } from '../../levels/exploration/LayoutTypes';

/**
 * AVENTURA 1 — O URSINHO E O CAMINHO DA GENTILEZA (seções 8 e 9 do prompt mestre V2)
 *
 * Construída SOBRE o parque da antiga Fase 1 (seção 24.1: preservar o que funciona).
 * Continuam aqui as correções do Marco 1: plataforma de chegada de parede a parede (B05),
 * placas nas paredes laterais fora da linha do salto (B07), piscina de bolinhas como
 * queda divertida e escadinha extra no Bicho-Preguiça.
 *
 * As SEIS ETAPAS INTERNAS (cada uma avisa o jogo quando termina):
 *  a01_e1  Chegar e aprender    entrada → corredor → blocos → túnel (andar, pegar, pular)
 *  a01_e2  Perceber e acolher   a Bia está chorando na praça: ela perdeu o ursinho
 *  a01_e3  Encontrar pistas     3 pistas em três lugares diferentes do parque
 *  a01_e4  Preparar um caminho  2 peças de apoio para o Beto encaixar; a passagem abre
 *  a01_e5  Encontrar e devolver o ursinho CERTO entre três parecidos, na mão dela
 *  a01_e6  Celebrar a ação      escorregador, trampolins e a festa da chegada
 *
 * Eixo: o personagem começa olhando para +Z. "Esquerda" do jogador = +X.
 * Cenário PLACEHOLDER (blocos coloridos no lugar dos brinquedos reais) até chegarem as
 * artes e fotos oficiais do parque. "Bia" é nome provisório (decisão da proprietária).
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
  opts: { icon?: string; mission?: string; tutorial?: boolean; minHint?: number; stage?: string } = {},
) {
  add({ t: 'message', id, min, max, text, ...opts });
}

// ============================================================ ESTRUTURA GERAL
floor(-16, 16, -8, 90, 0);
floor(-16, 16, 102, 190, 0, '#ffd1ec');
wallX(-16, -8, 190);
wallX(16, -8, 190);
wallZ(-8, -16, 16);
wallZ(190, -16, 16);
add({ t: 'box', min: [-16, H, -8], max: [16, H + 0.5, 190], style: 'wall', color: '#8a5cff', camera: false });
for (let z = 0; z < 190; z += 12) {
  add({ t: 'decor', kind: 'lightPanel', pos: [-4, H - 0.06, z], color: z % 24 ? PALETTE.pinkLight : '#ffffff', size: 1.2 });
  add({ t: 'decor', kind: 'lightPanel', pos: [4, H - 0.06, z + 6], color: z % 24 ? '#ffffff' : PALETTE.cyan, size: 1.2 });
}

// ============================================================ A — ENTRADA (etapa 1)
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
  { t: 'decor', kind: 'pillar', pos: [-6.5, 0, -6.2], color: PALETTE.pink, size: 1.6 },
  { t: 'decor', kind: 'pillar', pos: [6.5, 0, -6.2], color: PALETTE.green, size: 1.6 },
  { t: 'decor', kind: 'balloons', pos: [-6.4, 0, 8.2] },
  { t: 'decor', kind: 'balloons', pos: [6.4, 0, 8.2] },
  { t: 'decor', kind: 'cushion', pos: [-6.2, 0, 2], color: PALETTE.yellow },
  { t: 'decor', kind: 'cushion', pos: [6.2, 0, 3.5], color: PALETTE.cyan },
  { t: 'npc', character: 'guide', pos: [2.6, 0, 1.5], yaw: -2.6, anim: 'wave' },
  // Ursinho dourado #1: atrás do pilar, para quem olha em volta
  // Fica no cantinho atrás do pilar, no fim da fileira de moedas: quem se vira para trás
  // acha. (Antes ficava encostado no pilar, num vão de 1,1 m — apertado demais.)
  { t: 'collectible', id: 'a01_urso_1', pos: [-5.6, 1, -7.1] },
  { t: 'coinLine', from: [-4, 0.8, -6.5], to: [-6, 0.8, -6.5], count: 3 },
  // Amigo OPCIONAL: ajudar aqui vale a estrela "uma ajuda a mais no parque".
  {
    t: 'friend',
    id: 'dino',
    name: 'Dino Fofo',
    icon: '🦖',
    kind: 'dino',
    color: '#9be27a',
    accent: PALETTE.yellow,
    scale: 3.2,
    pos: [-5.5, 0, 7],
    yaw: -0.6,
    intro: 'Oi! Meu balão voou para o cantinho das moedas, lá no corredor. Você pega para mim? É só se você quiser!',
    mission: 'Pegue o balão do Dino (se quiser)',
    quest: { type: 'collect', group: 'balao', count: 1, flag: 'helpedExtra' },
    thanks: 'Meu balão! Obrigado! Você ajuda todo mundo mesmo!',
    hint: 'Tem uma criança chorando lá na frente, depois das redes. Será que ela precisa de ajuda?',
  },
  { t: 'questItem', id: 'balao_1', group: 'balao', kind: 'balloon', icon: '🎈', pos: [5.8, 1.7, 21], color: PALETTE.pink, scale: 1.6 },
);
msg('m_move', [-6, 0, -6], [6, 3, 3], 'Use as setas, WASD ou o joystick para andar!', {
  icon: '🕹️',
  mission: 'Conheça a Divertiland',
  tutorial: true,
});

// ============================================================ B — CORREDOR
wallX(-3.5, 10, 30, 0, H, PALETTE.purpleLight);
wallX(3.5, 10, 20, 0, H, PALETTE.purpleLight);
wallX(3.5, 24, 30, 0, H, PALETTE.purpleLight);
wallX(7.5, 19.75, 24.25, 0, H, WALL2);
wallZ(20, 3.5, 7.5, 0, H, WALL2);
wallZ(24, 3.5, 7.5, 0, H, WALL2);
add(
  { t: 'gem', pos: [5.8, 1, 23.4] },
  { t: 'decor', kind: 'star', pos: [6.6, 3, 22], color: PALETTE.yellow },
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

// ============================================================ D — TÚNEL (fim da etapa 1)
add(
  { t: 'box', min: [-6, 0, 40], max: [-1.75, 5, 54], color: PALETTE.purple },
  { t: 'box', min: [1.75, 0, 40], max: [6, 5, 54], color: PALETTE.pink },
  { t: 'box', min: [-1.75, 3.6, 40], max: [1.75, 5, 54], color: PALETTE.yellow },
  {
    t: 'tunnel',
    start: [0, 0, 40],
    axis: 'z',
    length: 14,
    radius: 1.6,
    colors: [PALETTE.pink, PALETTE.yellow, PALETTE.cyan, PALETTE.greenNeon, PALETTE.purple],
  },
  { t: 'coinLine', from: [0, 0.7, 41.5], to: [0, 0.7, 52.5], count: 8 },
  { t: 'cameraZone', min: [-1.6, 0, 39.5], max: [1.6, 3, 54.5], distance: 3.2, pitch: 0.12 },
  { t: 'decor', kind: 'neonSign', pos: [0, 4.2, 39.9], yaw: Math.PI, text: 'TÚNEL MALUCO', color: PALETTE.greenNeon, size: 0.55 },
);
msg('m_tunnel', [-6, 0, 39], [6, 3, 40.5], 'Entre no túnel colorido!', { icon: '🌀', mission: 'Atravesse o túnel' });
// A etapa 1 fecha aqui: a criança já andou, pegou moedas, pulou e atravessou o túnel.
msg('m_aprendeu', [-6, 0, 54.2], [6, 3, 55.4], 'Você já sabe andar, pegar Divertis e pular! Agora vamos conhecer o parque.', {
  icon: '🎉',
  mission: 'Conheça o parque',
  stage: 'a01_e1',
});

// ============================================================ E — BLOCOS MALUCOS
wallZ(54, -9, -6, 0, H, WALL);
wallZ(54, 6, 9, 0, H, WALL);
wallX(-9, 54, 124, 0, H, WALL);
wallX(-9, 124, 128, 7, H, WALL); // acima da cortina secreta
wallX(-9, 128, 136, 0, H, WALL);
wallX(-9, 140, 156, 0, H, WALL);
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
  // Pilha de almofadas: ursinho dourado #2 no alto
  { t: 'box', min: [5.5, 0, 72.5], max: [8.8, 0.7, 75.5], color: PALETTE.yellow },
  { t: 'box', min: [6.6, 0, 75.5], max: [8.8, 1.4, 77.5], color: PALETTE.green },
  { t: 'box', min: [6.6, 0, 77.5], max: [8.8, 2.3, 80], color: PALETTE.purple },
  { t: 'collectible', id: 'a01_urso_2', pos: [7.7, 3.3, 78.8] },
  { t: 'decor', kind: 'neonSign', pos: [8.7, 6, 66], yaw: -Math.PI / 2, text: 'BLOCOS MALUCOS', color: PALETTE.orange, size: 0.7 },
  { t: 'decor', kind: 'balloons', pos: [-8, 0, 78] },
);
msg('m_bumpers', [-9, 0, 55.6], [9, 3, 58], 'Desvie dos blocos malucos! Se encostar, eles te empurram!', {
  icon: '😄',
  mission: 'Passe pelos blocos malucos',
});
msg('m_spinner', [-9, 0, 72.5], [5, 3, 74], 'Pule a barra giratória!', { icon: '🌀' });
msg('m_teddy2', [3, 0, 69], [9, 3, 72.4], 'Um ursinho dourado lá no alto das almofadas!', { icon: '🧸', minHint: 2 });

// ============================================================ F — REDE, PONTE E PISCINA DE BOLINHAS
add(
  { t: 'box', min: [-9, 0, 84], max: [9, 4, 90], color: PALETTE.purple },
  { t: 'net', min: [-3, 0, 83.8], max: [3, 4, 84], normal: [0, -1], color: PALETTE.greenNeon },
  { t: 'checkpoint', id: 'cp2', pos: [-2.2, 4, 87] },
  { t: 'netBridge', min: [-1.5, 3.8, 90], max: [1.5, 4, 102], color: '#ffffff' },
  { t: 'coinLine', from: [0, 4.7, 92], to: [0, 4.7, 101], count: 7 },
  // PEÇA DE APOIO #1: está no meio da ponte, dá para pegar atravessando.
  { t: 'questItem', id: 'apoio_1', group: 'apoio', kind: 'stack', icon: '🧩', pos: [0, 4.5, 96], color: PALETTE.orange, scale: 1.1 },
  { t: 'ballpit', min: [-9, 0.02, 90], max: [9, 0.02, 102], depth: 0.75 },
  { t: 'gem', pos: [5, 1.2, 96] },
  // PISTA #1: dentro da piscina de bolinhas (cair aqui é diversão, não castigo).
  { t: 'questItem', id: 'pista_1', group: 'pistas', kind: 'teddy', icon: '🐾', pos: [-5, 0.9, 96], color: '#c98a52', scale: 1.1 },
  { t: 'box', min: [-9, 0, 102], max: [9, 4, 110], color: PALETTE.pink },
  // Duas redes NAS LATERAIS: a ponte de rede passa por cima do meio (x -1,5 a 1,5) e
  // subir pelo centro era impossível — a criança batia a cabeça e ficava presa na metade.
  { t: 'net', min: [-3.6, 0, 101.8], max: [-1.9, 4, 102], normal: [0, -1], color: PALETTE.yellow },
  { t: 'net', min: [1.9, 0, 101.8], max: [3.6, 4, 102], normal: [0, -1], color: PALETTE.yellow },
  { t: 'decor', kind: 'neonSign', pos: [0, 7.5, 83.6], yaw: Math.PI, text: 'CIRCUITO DAS REDES', color: PALETTE.greenNeon, size: 0.7 },
);
msg('m_net', [-9, 0, 80.5], [9, 3, 83.6], 'Ande até a rede e continue andando para escalar!', {
  icon: '🧗',
  mission: 'Suba na rede',
  tutorial: true,
});
msg('m_bridge', [-9, 4, 87.5], [9, 7, 90], 'Atravesse a ponte! Se cair, é piscina de bolinhas!', {
  icon: '🎉',
  mission: 'Atravesse a ponte de rede',
});
msg('m_pit', [-9, 0, 90], [9, 1.5, 102], 'Piscina de bolinhas! Suba por uma das redes amarelas dos cantinhos!', {
  icon: '🧗',
  mission: 'Suba pela rede amarela',
});

// ============================================================ PRAÇA — A BIA (etapas 2, 3 e 5)
add(
  { t: 'checkpoint', id: 'cp3', pos: [0, 4, 105] },
  {
    t: 'friend',
    id: 'bia',
    name: 'Bia',
    icon: '🧒',
    kind: 'teddy',
    color: '#ffb3d9',
    accent: '#ffffff',
    scale: 3.2,
    pos: [3.5, 4, 107.5],
    yaw: Math.PI,
    intro:
      'Snif... eu perdi o meu ursinho aqui no parque. Ele é marrom e tem um laço rosa. Eu durmo abraçada com ele... Você me ajuda a procurar?',
    mission: 'Ache as 3 pistas do ursinho',
    quest: { type: 'collect', group: 'pistas', count: 3, flag: 'achouPistas' },
    thanks: 'Três pistas! Então ele foi para o recanto tranquilo, atrás da passagem!',
    hint: 'As pistas estão na piscina de bolinhas, atrás da portinha do botão e no caminho das plataformas.',
    stageMeet: 'a01_e2',
    stage: 'a01_e3',
    // SEGUNDA parte: a história só termina quando o ursinho volta para a MÃO dela.
    quest2: { type: 'collect', group: 'ursinho', count: 1, flag: 'devolveu' },
    intro2: 'O recanto tranquilo é lá na frente! Mas tem três ursinhos parecidos... o meu é MARROM com LAÇO ROSA.',
    mission2: 'Leve o ursinho certo para a Bia',
    thanks2: 'MEU URSINHO! Você achou! Obrigada, obrigada! Agora eu posso brincar de novo! 💛',
    hint2: 'Olhe o laço: o meu ursinho tem laço ROSA.',
    stage2: 'a01_e5',
  },
  // "Foto" do ursinho, na parede lateral (fora da linha do salto — B07).
  { t: 'sign', pos: [8.7, 6.4, 107.5], yaw: -Math.PI / 2, text: '🧸 marrom + laço rosa', color: PALETTE.pink, w: 3.4, h: 1.2 },
  { t: 'decor', kind: 'cushion', pos: [6.5, 4, 104], color: PALETTE.yellow },
  { t: 'prop', kind: 'plant', pos: [-7, 4, 104], color: PALETTE.green, scale: 2 },
  { t: 'prop', kind: 'plant', pos: [-7, 4, 108.5], color: PALETTE.pink, scale: 2 },
);
msg('m_bia', [-9, 4, 102.2], [9, 7, 105], 'Alguém está chorando ali... vamos ver quem é? Chegue perto e aperte E (ou ✋) para conversar.', {
  icon: '💬',
  mission: 'Fale com a criança que está chorando',
  tutorial: true,
});

// ============================================================ G — OS DOIS CAMINHOS (pistas 2 e 3 + apoio 2)
add(
  // B07: placas nas paredes laterais, viradas para quem chega, acima da linha do salto.
  { t: 'sign', pos: [8.7, 7.6, 112], yaw: -Math.PI / 2, text: '⬅️ Plataformas', color: PALETTE.orange, w: 3, h: 1 },
  { t: 'sign', pos: [-8.7, 7.6, 112], yaw: Math.PI / 2, text: 'Portinha ➡️', color: PALETTE.green, w: 3, h: 1 },
  { t: 'box', min: [-4, 0, 110], max: [2.6, 7.5, 134], color: PALETTE.purpleLight },
  { t: 'decor', kind: 'neonSign', pos: [-0.7, 9, 110.1], yaw: Math.PI, text: 'DOIS CAMINHOS', color: PALETTE.yellow, size: 0.7 },
  // --- Caminho tranquilo (-X): passarela com botão, portão, cortina secreta e o Beto
  { t: 'box', min: [-9, 0, 110], max: [-4, 4, 134], color: PALETTE.green },
  { t: 'button', id: 'btn_gate', pos: [-5.4, 4, 115.4], target: 'gate_1' },
  { t: 'gate', id: 'gate_1', min: [-9, 4, 117.8], max: [-4, 7.5, 118.4], color: PALETTE.orange },
  { t: 'coinLine', from: [-6.5, 4.8, 121.5], to: [-6.5, 4.8, 132], count: 7 },
  // PISTA #2: só chega aqui quem aperta o botão e abre a portinha.
  { t: 'questItem', id: 'pista_2', group: 'pistas', kind: 'present', icon: '🎀', pos: [-5.2, 4.5, 120.5], color: PALETTE.pink, scale: 1.1 },
  { t: 'curtain', min: [-9.2, 4, 124], max: [-8.8, 7, 128] },
  // --- SALA SECRETA (a mesma do protótipo, agora com um desafio próprio)
  { t: 'box', min: [-15, 0, 121], max: [-9, 4, 131], color: PALETTE.yellow },
  { t: 'box', min: [-15.5, 4, 121], max: [-15, 9, 131], style: 'wall', color: PALETTE.pinkLight },
  { t: 'box', min: [-15, 4, 120.5], max: [-9, 9, 121], style: 'wall', color: PALETTE.pinkLight },
  { t: 'box', min: [-15, 4, 131], max: [-9, 9, 131.5], style: 'wall', color: PALETTE.pinkLight },
  { t: 'box', min: [-15, 9, 120.5], max: [-9, 9.4, 131.5], style: 'wall', color: PALETTE.purple, camera: false },
  { t: 'secretZone', id: 'a01_sala_secreta', min: [-14.5, 4, 121.5], max: [-9.6, 8, 130.5] },
  { t: 'decor', kind: 'neonSign', pos: [-14.8, 7.3, 126], yaw: Math.PI / 2, text: 'SALA SECRETA', color: PALETTE.pink, size: 0.6 },
  // desafio da sala secreta: subir pelas plataformas e pelo trampolim até as gemas
  { t: 'platform', pos: [-11, 5.2, 123], size: [2, 2], scales: true, color: PALETTE.cyan },
  { t: 'platform', pos: [-13.4, 6.2, 125], size: [2, 2], scales: true, color: PALETTE.green },
  { t: 'trampoline', pos: [-11, 4.4, 129], radius: 1.4 },
  { t: 'gem', pos: [-11, 6.2, 123] },
  { t: 'gem', pos: [-13.4, 7.2, 125] },
  { t: 'gem', pos: [-11, 8, 129] },
  { t: 'coinArc', center: [-12, 4.8, 127], radius: 1.8, count: 8 },
  { t: 'decor', kind: 'star', pos: [-12, 8.4, 126], color: PALETTE.yellow, size: 1.3 },
  { t: 'hintTrail', points: [[-6, 4.5, 121], [-7.5, 4.5, 123.5], [-8.6, 4.5, 125.5], [-10, 4.5, 126]], minHint: 1 },
  // --- Caminho das plataformas (+X), sobre um fosso que devolve ao ponto seguro
  { t: 'killZone', min: [2.6, -1, 110], max: [9, 2.6, 134] },
  { t: 'platform', pos: [6, 4, 112.4], size: [2.4, 2.4], scales: true, color: PALETTE.orange },
  { t: 'platform', pos: [4.8, 4, 115.5], size: [2.2, 2.2], scales: true, color: PALETTE.cyan },
  // PONTOS SEGUROS SÓ NO BICHO-PREGUIÇA: a ajuda "Vamos juntos?" leva a criança de um
  // ponto seguro ao seguinte. Sem estes, depois de três quedas ela seria levada para
  // DEPOIS do caminho das plataformas — pulando a pista 3 e a peça de apoio, que são
  // obrigatórias. Com eles, cada parada fica ao lado do que ela precisa pegar.
  { t: 'checkpoint', id: 'cp_plat1', pos: [4.8, 4, 115.5], onlyIn: ['sloth'] },
  { t: 'platform', pos: [5, 4, 119.5], size: [2.2, 2.2], scales: true, color: PALETTE.pink, move: { to: [7.6, 4, 119.5], period: 4 } },
  { t: 'platform', pos: [6, 4, 123], size: [3.2, 3.2], shape: 'disc', scales: true, color: PALETTE.yellow, spin: 0.8 },
  { t: 'checkpoint', id: 'cp_plat2', pos: [6.8, 4, 123], onlyIn: ['sloth'] },
  // PISTA #3: na plataforma que gira — ela conta o detalhe que resolve a escolha final.
  { t: 'questItem', id: 'pista_3', group: 'pistas', kind: 'teddy', icon: '🧸', pos: [6, 4.8, 123], color: '#c98a52', scale: 1.1 },
  { t: 'platform', pos: [5, 4.6, 126.5], size: [2.2, 2.2], scales: true, color: PALETTE.green },
  { t: 'checkpoint', id: 'cp_plat3', pos: [5.7, 4.6, 126.5], onlyIn: ['sloth'] },
  // PEÇA DE APOIO #2
  { t: 'questItem', id: 'apoio_2', group: 'apoio', kind: 'stack', icon: '🧩', pos: [5, 5.4, 126.5], color: PALETTE.orange, scale: 1.1 },
  { t: 'platform', pos: [7, 4, 129.5], size: [2.4, 2.4], scales: true, color: PALETTE.purple },
  { t: 'platform', pos: [5.4, 4, 132.4], size: [2.4, 2.4], scales: true, color: PALETTE.pink },
  { t: 'checkpoint', id: 'cp_plat4', pos: [5.4, 4, 132.4], onlyIn: ['sloth'] },
  { t: 'coinLine', from: [6, 4.9, 111.8], to: [6, 4.9, 113], count: 2 },
  { t: 'coinLine', from: [4.8, 4.9, 114.9], to: [4.8, 4.9, 116.1], count: 2 },
  { t: 'coinLine', from: [5, 5.4, 119.5], to: [7.6, 5.4, 119.5], count: 3 },
  { t: 'gem', pos: [7, 5, 129.5] },
  { t: 'platform', pos: [8, 6.4, 125.4], size: [1.6, 1.6], color: PALETTE.yellow, onlyIn: ['jaguar'] },
  { t: 'gem', pos: [8, 7.4, 125.4], onlyIn: ['jaguar'] },
);
msg('m_choice', [-9, 4, 108.6], [9, 7, 110], 'Dois caminhos: as plataformas ou a portinha do botão. Tem pista nos dois!', {
  icon: '🤔',
  mission: 'Ache as 3 pistas do ursinho',
});
msg('m_button', [-9, 4, 111], [-4, 7, 113.5], 'Aperte o botão vermelho para abrir a portinha! (E ou ✋)', {
  icon: '🔴',
  mission: 'Aperte o botão',
  tutorial: true,
});
msg('m_pista2', [-9, 4, 118.6], [-4, 7, 120], 'Um laço rosa no chão! É igualzinho ao do ursinho da Bia.', { icon: '🎀' });
msg('m_curtain', [-9, 4, 120.5], [-4, 7, 123], 'Hmm... essa cortina colorida parece diferente!', { icon: '🤔', minHint: 2 });
msg('m_plats', [2.6, 4, 110], [9, 7, 111.5], 'Pule de plataforma em plataforma!', { icon: '🦘', mission: 'Pule nas plataformas' });
msg('m_pista3', [2.6, 4, 121], [9, 7, 125], 'Pelo marrom e um fiozinho de laço ROSA. O ursinho dela passou por aqui!', { icon: '🐾' });

// ============================================================ H — PASSAGEM E RECANTO TRANQUILO (etapa 5)
add(
  { t: 'box', min: [-9, 0, 134], max: [9, 4, 140], color: PALETTE.cyan },
  { t: 'checkpoint', id: 'cp4', pos: [4, 4, 137] },
  // A porta do recanto é o portão da etapa 4: só abre com o apoio encaixado.
  { t: 'questGate', id: 'g_caminho', min: [-9.6, 4, 136], max: [-9, 8, 140], flag: 'caminhoPronto', color: PALETTE.orange, stage: 'a01_e4' },
  {
    t: 'friend',
    id: 'beto',
    name: 'Robô Beto',
    icon: '🤖',
    kind: 'robot',
    color: '#b9c3d6',
    accent: PALETTE.cyan,
    scale: 3.4,
    pos: [-5.5, 4, 137.8],
    yaw: -Math.PI / 2,
    intro: 'Bip-bop! A porta do recanto tranquilo está sem apoio. Me traga as 2 peças de encaixe e eu monto o caminho!',
    mission: 'Ache as 2 peças de apoio',
    quest: { type: 'collect', group: 'apoio', count: 2, flag: 'caminhoPronto' },
    thanks: 'Bip! Encaixou! A porta está firme, pode entrar!',
    hint: 'Uma peça fica no meio da ponte de rede e a outra no caminho das plataformas.',
    stage: 'a01_e4',
  },
  { t: 'sign', pos: [-8.7, 6.4, 134.6], yaw: Math.PI / 2, text: '🧩 Beto monta a porta', color: PALETTE.cyan, w: 3, h: 1 },
  { t: 'box', min: [-9, 4, 139.6], max: [-1.75, 5.1, 140], color: PALETTE.pink },
  { t: 'box', min: [1.75, 4, 139.6], max: [9, 5.1, 140], color: PALETTE.pink },
  { t: 'decor', kind: 'neonSign', pos: [5.5, 7.4, 139.8], yaw: Math.PI, text: 'ESCORREGADOR', color: PALETTE.pink, size: 0.6 },
  { t: 'sign', pos: [8.7, 6.4, 136], yaw: -Math.PI / 2, text: 'Recanto ⬅️', color: PALETTE.green, w: 2.8, h: 1 },
);
// Sala do recanto: piso em y 4, entrada pela parede x -9 entre z 136 e 140.
// A sala fica ENTRE as paredes que já existem no parque (x -16 e x -9). A primeira
// versão ia até x -26 e a parede externa do parque (x -16) cortava a sala no meio: o
// ursinho dourado ficava inacessível e a criança travava encostada na parede.
add(
  { t: 'box', min: [-15.7, 3.5, 132], max: [-9, 4, 150], style: 'mat', color: '#eafff2' },
  { t: 'box', min: [-15.7, 4, 131.5], max: [-9, 11, 132], style: 'wall', color: '#cdf5dd' },
  { t: 'box', min: [-15.7, 4, 150], max: [-9, 11, 150.5], style: 'wall', color: '#cdf5dd' },
  { t: 'box', min: [-9.5, 4, 132], max: [-9, 11, 136], style: 'wall', color: '#cdf5dd' },
  { t: 'box', min: [-9.5, 4, 140], max: [-9, 11, 150], style: 'wall', color: '#cdf5dd' },
  { t: 'box', min: [-15.7, 11, 131.5], max: [-9, 11.4, 150.5], style: 'wall', color: PALETTE.green, camera: false },
  { t: 'decor', kind: 'neonSign', pos: [-12.4, 8.6, 149.7], yaw: Math.PI, text: 'RECANTO TRANQUILO', color: PALETTE.greenNeon, size: 0.6 },
  { t: 'checkpoint', id: 'cp_recanto', pos: [-11, 4, 138], needsFlag: 'caminhoPronto' },
  // Três ursinhos parecidos em três banquinhos: só UM é o da Bia.
  { t: 'box', min: [-13.4, 4, 141.2], max: [-11.4, 4.8, 143.2], color: PALETTE.yellow },
  // Na BORDA da frente do banquinho: é o item mais importante da aventura, então ele fica
  // ao alcance de quem simplesmente chega perto (o raio de coleta é 1,1 m).
  { t: 'questItem', id: 'ursinho_bia', group: 'ursinho', kind: 'teddy', icon: '🧸', pos: [-12.4, 4.85, 141.4], color: '#c98a52', scale: 1.7 },
  { t: 'sign', pos: [-12.4, 6.6, 143.3], yaw: 0, text: '🎀 laço rosa', color: PALETTE.pink, w: 2, h: 0.7 },
  { t: 'box', min: [-14.8, 4, 145.6], max: [-12.8, 4.8, 147.6], color: PALETTE.cyan },
  {
    t: 'friend',
    id: 'urso_azul',
    name: 'Urso Azul',
    icon: '🧸',
    kind: 'teddy',
    color: '#7fc6ff',
    accent: PALETTE.cyan,
    scale: 2.2,
    pos: [-13.8, 4.8, 146.6],
    yaw: 0.4,
    intro: 'Oi! Eu sou o Urso Azul e eu moro aqui. Eu tenho laço AZUL — o da Bia é de laço ROSA. Não sou eu!',
    thanks: 'Procure o de laço rosa! Boa sorte!',
  },
  { t: 'box', min: [-11.8, 4, 146.4], max: [-9.8, 4.8, 148.4], color: PALETTE.purple },
  {
    t: 'friend',
    id: 'urso_grande',
    name: 'Urso Grandão',
    icon: '🧸',
    kind: 'teddy',
    color: '#d9b38c',
    accent: PALETTE.purple,
    scale: 3.4,
    pos: [-10.8, 4.8, 147.4],
    yaw: -0.4,
    intro: 'Eu sou marrom, mas sou GRANDÃO e não tenho laço nenhum. O ursinho da Bia é pequeno e tem laço rosa!',
    thanks: 'O pequeninho de laço rosa está naquele banquinho amarelo!',
  },
  // Ursinho dourado #3: só quem chega até aqui encontra (precisa das pistas e do apoio).
  { t: 'box', min: [-15.2, 4, 133], max: [-13.2, 5.6, 135], color: PALETTE.pink },
  { t: 'box', min: [-13.2, 4, 134], max: [-11.2, 6.8, 136], color: PALETTE.orange },
  { t: 'collectible', id: 'a01_urso_3', pos: [-12.2, 7.8, 135] },
  { t: 'coinArc', center: [-12.4, 4.9, 139], radius: 1.8, count: 8 },
  { t: 'coinLine', from: [-14.6, 4.8, 149], to: [-10.4, 4.8, 149], count: 5 },
  { t: 'gem', pos: [-14.8, 4.8, 137.5] },
  { t: 'prop', kind: 'cushion', pos: [-14.6, 4, 142], color: PALETTE.pinkLight, scale: 1.4, solid: true },
  { t: 'prop', kind: 'plant', pos: [-9.8, 4, 149.2], color: PALETTE.green, scale: 2 },
  { t: 'prop', kind: 'lamp', pos: [-9.8, 4, 133.2], color: PALETTE.yellow, accent: PALETTE.purple, scale: 2.2 },
);
msg('m_beto', [-9, 4, 134.4], [0, 7, 139], 'O Beto está consertando a porta do recanto. Fale com ele! (E ou ✋)', {
  icon: '🤖',
  mission: 'Fale com o Robô Beto',
});
msg('m_recanto', [-13, 4, 136], [-9.7, 7, 140], 'Três ursinhos parecidos! Qual é o da Bia? Lembre do laço ROSA.', {
  icon: '🧸',
  mission: 'Pegue o ursinho de laço rosa',
});
msg('m_volta', [-12, 4, 140.2], [-9.7, 7, 143.5], 'Pegou? Agora leve o ursinho de volta para a Bia, na praça das redes!', {
  icon: '💛',
  mission: 'Leve o ursinho para a Bia',
});

// ============================================================ I — ESCORREGADOR, TRAMPOLINS E FESTA (etapa 6)
add(
  { t: 'questGate', id: 'g_festa', min: [-1.9, 4, 139.4], max: [1.9, 8, 140.1], flag: 'devolveu', color: PALETTE.pink },
  { t: 'ramp', min: [-1.5, 0, 140], max: [1.5, 4, 156], axis: 'z', h0: 4, h1: 0, slide: true, rails: true, color: PALETTE.yellow },
  { t: 'coinLine', from: [0, 4.2, 142], to: [0, 1.2, 153], count: 6 },
  { t: 'decor', kind: 'cushion', pos: [5, 0, 150], color: PALETTE.green },
);
msg('m_slide', [-1.75, 4, 136.4], [1.75, 7, 139.2], 'A festa é lá embaixo! Hora do escorregador! Wiii!', {
  icon: '🛝',
  mission: 'Desça o escorregador',
});
wallZ(156, -12, -9, 0, H, WALL);
wallZ(156, 9, 12, 0, H, WALL);
wallX(-12, 156, 190, 0, H, WALL2);
wallX(12, 156, 190, 0, H, WALL2);
add(
  { t: 'checkpoint', id: 'cp5', pos: [-3, 0, 158.5], needsFlag: 'devolveu' },
  { t: 'trampoline', pos: [-5, 0.4, 164], radius: 1.5 },
  // Fica perto da borda da plataforma da festa (z 175): quem quica alto cai em cima dela
  // sem precisar "planar" 2,6 m no ar — medido, esse vão fazia a criança cair de volta.
  { t: 'trampoline', pos: [0, 0.4, 173], radius: 1.7 },
  { t: 'trampoline', pos: [5, 0.4, 164], radius: 1.5 },
  { t: 'coinLine', from: [-5, 3, 164], to: [-5, 9, 164], count: 4 },
  { t: 'coinLine', from: [0, 3.5, 173], to: [0, 9.5, 173], count: 4 },
  { t: 'gem', pos: [5, 8, 164] },
  // B05: a plataforma da chegada ocupa a sala INTEIRA, de parede a parede.
  { t: 'box', min: [-12, 0, 175], max: [12, 7, 190], color: PALETTE.purple },
  { t: 'finish', pos: [0, 7, 182], stage: 'a01_e6' },
  { t: 'npc', character: 'guide', pos: [3, 7, 183.5], yaw: Math.PI, anim: 'dance' },
  { t: 'decor', kind: 'neonSign', pos: [0, 11.5, 189.7], yaw: Math.PI, text: 'VOCÊ AJUDOU A BIA!', color: PALETTE.yellow, size: 1 },
  { t: 'decor', kind: 'star', pos: [-8, 9, 172], color: PALETTE.pink, size: 1.4 },
  { t: 'decor', kind: 'star', pos: [8, 10, 178], color: PALETTE.yellow, size: 1.4 },
  { t: 'decor', kind: 'balloons', pos: [-5, 7, 188] },
  { t: 'decor', kind: 'balloons', pos: [5, 7, 188] },
  { t: 'decor', kind: 'ring', pos: [0, 11, 174], color: PALETTE.greenNeon, size: 1.6 },
  // Escadinha extra só no Bicho-Preguiça (ninguém fica preso).
  { t: 'box', min: [-11.5, 0, 160], max: [-8, 1.2, 164], color: PALETTE.green, onlyIn: ['sloth'] },
  { t: 'box', min: [-11.5, 0, 164], max: [-8, 2.4, 167], color: PALETTE.yellow, onlyIn: ['sloth'] },
  { t: 'box', min: [-11.5, 0, 167], max: [-8, 3.6, 170], color: PALETTE.pink, onlyIn: ['sloth'] },
  { t: 'box', min: [-11.5, 0, 170], max: [-8, 4.8, 173], color: PALETTE.cyan, onlyIn: ['sloth'] },
  { t: 'box', min: [-11.5, 0, 173], max: [-6, 6, 176.5], color: PALETTE.orange, onlyIn: ['sloth'] },
);
msg('m_tramp', [-12, 0, 157], [12, 3, 160.5], 'Pule no trampolim várias vezes para ir cada vez mais alto!', {
  icon: '🤸',
  mission: 'Suba até a festa!',
  tutorial: true,
});
msg('m_stairs', [-12, 0, 160.5], [-6, 3, 163], 'Também dá para subir pela escadinha colorida!', { icon: '🪜', minHint: 2 });

export const LEVEL_A01: LevelLayout = {
  id: 'a01',
  spawn: { pos: [0, 0, -3], yaw: 0 },
  killY: -6,
  environment: { background: '#cdb6ff', fog: '#e7dbff', fogNear: 30, fogFar: 95 },
  music: 'world1',
  entities: E,
};
