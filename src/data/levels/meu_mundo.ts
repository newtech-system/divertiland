import { PALETTE } from '../../engine/materials';
import { ADVENTURES } from '../adventures';
import type { LayoutEntity, LevelLayout, Vec3 } from '../../levels/exploration/LayoutTypes';

/**
 * MEU MUNDO DIVERTILAND — terreno mínimo navegável (seção 14 do prompt mestre V2).
 *
 * O que esta versão É: um terreno próprio, seguro e explorável, com o lugar reservado
 * (e identificado) de cada peça temática que as cinco aventuras liberam, e a saída
 * sinalizada de volta para o mapa.
 *
 * O que esta versão NÃO É (e o jogo diz isso para a criança, em vez de fingir):
 * ainda não dá para pegar um brinquedo e colocar onde quiser, nem expandir o terreno,
 * nem visitar o mundo de outra pessoa. Isso vem nas etapas seguintes.
 *
 * É um ESPAÇO LIVRE (`sandbox` no data/worlds.ts): não tem estrela, não tem conclusão,
 * não dá Divertis e não grava partida em andamento — entrar e sair daqui nunca mexe no
 * progresso de uma aventura.
 */

const E: LayoutEntity[] = [];
const add = (...e: LayoutEntity[]) => E.push(...e);

const R = 30; // metade do terreno (60 m x 60 m)
const FENCE = 2.6;

/** Cerca: a criança não cai do mundo e a câmera não fica presa atrás dela. */
function fence(x0: number, z0: number, x1: number, z1: number) {
  add({ t: 'box', min: [x0, 0, z0], max: [x1, FENCE, z1], style: 'wall', color: '#ffd9f0', camera: false });
}

// ---------------------------------------------------------------- terreno
add({ t: 'box', min: [-R, -1, -R], max: [R, 0, R], style: 'mat', color: '#b6f2c8' });
// caminho central de pedrinhas (ajuda a criança a se orientar)
add({ t: 'box', min: [-2.2, 0, -R + 2], max: [2.2, 0.06, 18], style: 'mat', color: '#ffe9a8' });
fence(-R, -R, R, -R + 0.5);
fence(-R, R - 0.5, R, R);
fence(-R, -R, -R + 0.5, R);
fence(R - 0.5, -R, R, R);

// ---------------------------------------------------------------- entrada e saída
add(
  { t: 'decor', kind: 'arch', pos: [0, 0, -26], size: 1.3 },
  { t: 'decor', kind: 'neonSign', pos: [0, 5.2, -27.5], text: 'MEU MUNDO', color: PALETTE.pink, size: 1 },
  { t: 'sign', pos: [-4.6, 2.2, -26], yaw: 0, text: '🚪 ande até aqui para voltar', color: PALETTE.cyan, w: 3.6, h: 1 },
  { t: 'finish', pos: [0, 0, -28.4] },
  { t: 'npc', character: 'guide', pos: [3.4, 0, -24], yaw: -2.8, anim: 'wave' },
  { t: 'decor', kind: 'balloons', pos: [-5, 0, -27] },
  { t: 'decor', kind: 'balloons', pos: [5, 0, -27] },
);

/**
 * Terrenos reservados: um por aventura, na ordem das cinco. A placa diz o nome da peça
 * e a aventura que a libera — sem prometer o que ainda não existe.
 */
const PLOTS: Vec3[] = [
  [-14, 0, 2],
  [14, 0, 2],
  [-18, 0, 16],
  [18, 0, 16],
  [0, 0, 24],
];
ADVENTURES.forEach((adv, i) => {
  const [x, , z] = PLOTS[i];
  add(
    { t: 'box', min: [x - 4, 0, z - 4], max: [x + 4, 0.25, z + 4], style: 'mat', color: i % 2 ? '#ffeec2' : '#d9e9ff' },
    { t: 'decor', kind: 'ring', pos: [x, 1.6, z], color: i % 2 ? PALETTE.yellow : PALETTE.cyan, size: 1.2 },
    { t: 'sign', pos: [x, 1.9, z - 4.4], yaw: 0, text: `${adv.worldPiece.icon} ${adv.worldPiece.name}`, color: PALETTE.purple, w: 4, h: 1.1 },
    { t: 'prop', kind: 'plant', pos: [x - 3.2, 0.25, z + 3.2], color: PALETTE.green, scale: 1.8 },
    { t: 'prop', kind: 'plant', pos: [x + 3.2, 0.25, z + 3.2], color: PALETTE.pinkLight, scale: 1.8 },
  );
  add({
    t: 'message',
    id: `mm_plot_${adv.id}`,
    min: [x - 4.5, 0, z - 5],
    max: [x + 4.5, 3, z + 4.5],
    text: `Aqui vai ficar a peça "${adv.worldPiece.name}", da aventura ${adv.order}. Colocar e enfeitar chega numa próxima atualização!`,
    icon: adv.worldPiece.icon,
  });
});

// ---------------------------------------------------------------- lugar de brincar
add(
  { t: 'trampoline', pos: [-6, 0.4, 12], radius: 1.6 },
  { t: 'trampoline', pos: [6, 0.4, 12], radius: 1.6 },
  { t: 'ballpit', min: [-5, 0.02, -12], max: [5, 0.02, -6], depth: 0.7 },
  { t: 'ramp', min: [8, 0, -14], max: [16, 2.4, -8], axis: 'z', h0: 0, h1: 2.4, color: PALETTE.orange },
  { t: 'box', min: [8, 0, -8], max: [16, 2.4, -4], color: PALETTE.yellow },
  { t: 'prop', kind: 'cushion', pos: [-10, 0, -4], color: PALETTE.cyan, scale: 1.8, solid: true },
  { t: 'prop', kind: 'cushion', pos: [-12, 0, -7], color: PALETTE.pink, scale: 1.8, solid: true },
  { t: 'prop', kind: 'toybox', pos: [11, 0, 24], color: PALETTE.purple, accent: PALETTE.yellow, scale: 1.6, solid: true },
  { t: 'prop', kind: 'lamp', pos: [-24, 0, -20], color: PALETTE.yellow, accent: PALETTE.purple, scale: 2.4 },
  { t: 'prop', kind: 'lamp', pos: [24, 0, -20], color: PALETTE.cyan, accent: PALETTE.purple, scale: 2.4 },
  { t: 'decor', kind: 'star', pos: [-20, 4, 26], color: PALETTE.yellow, size: 1.3 },
  { t: 'decor', kind: 'star', pos: [20, 4, 26], color: PALETTE.pink, size: 1.3 },
  { t: 'checkpoint', id: 'mm_cp', pos: [0, 0, -20] },
);
add({
  t: 'message',
  id: 'mm_bemvindo',
  min: [-3.5, 0, -24],
  max: [3.5, 3, -18],
  text: 'Este terreno é seu! Hoje dá para explorar e pular. Construir chega em breve.',
  icon: '🏡',
  mission: 'Explore o seu mundo',
  tutorial: true,
});
add({
  t: 'message',
  id: 'mm_brincar',
  min: [-8, 0, 9],
  max: [8, 3, 15],
  text: 'Trampolins! Pule à vontade. Quando quiser voltar, ande até o portal da entrada.',
  icon: '🤸',
});

export const LEVEL_MEU_MUNDO: LevelLayout = {
  id: 'meu_mundo',
  spawn: { pos: [0, 0, -21], yaw: 0 },
  killY: -8,
  environment: { background: '#a9e8ff', fog: '#dff6ff', fogNear: 45, fogFar: 130 },
  music: 'map',
  entities: E,
};
