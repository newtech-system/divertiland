import { PALETTE } from '../../engine/materials';
import type { DecorProp, HiddenRoomData, HiddenTarget, Spot, V3t } from '../../levels/hidden/HiddenTypes';

/**
 * FASE 2 — CADÊ O BRINQUEDO? (objetos escondidos, fase curta)
 * Sala de brinquedos da Divertiland vista do centro. A criança gira a câmera e toca nos
 * objetos que o Jhow perdeu. Cada objeto tem 2–3 lugares possíveis (sorteados a cada
 * partida = vale a pena jogar de novo). Muitos brinquedos "de enfeite" deixam a sala rica.
 */

const R = 8.6; // distância das estantes
const deg = (d: number) => (d * Math.PI) / 180;
function polar(angle: number, dist: number, y: number): V3t {
  return [Math.sin(deg(angle)) * dist, y, Math.cos(deg(angle)) * dist];
}
const facing = (angle: number) => deg(angle) + Math.PI;
/** Lugar numa prateleira: ângulo da estante, andar (0–3) e deslocamento lateral (-1..1). */
function shelf(angle: number, level: number, off: number): Spot {
  const a = deg(angle);
  const base = polar(angle, R, 0);
  return {
    pos: [base[0] + Math.cos(a) * off * 0.55, 0.08 + level * 0.5, base[2] - Math.sin(a) * off * 0.55],
    rotY: facing(angle),
  };
}
function floor(angle: number, dist: number, y = 0, rot = 0): Spot {
  return { pos: polar(angle, dist, y), rotY: facing(angle) + rot };
}

const TABLE = polar(100, 4.2, 0);
const onTable = (dx: number, dz: number): Spot => ({ pos: [TABLE[0] + dx, 0.6, TABLE[2] + dz], rotY: 0.6 });

// ------------------------------------------------------------------ cenário
const decor: DecorProp[] = [];
const SHELVES = [0, 55, 125, 235, 305];
const SHELF_COLORS = [PALETTE.purple, PALETTE.pink, PALETTE.cyan, PALETTE.orange, PALETTE.green];
SHELVES.forEach((a, i) => {
  const p = polar(a, R + 0.05, 0);
  decor.push({ kind: 'shelf', pos: p, rotY: facing(a), color: SHELF_COLORS[i], accent: '#ffffff', scale: 1.1, occludes: true });
});
// Brinquedos de enfeite nas prateleiras (não são procurados)
const decoyKinds = ['block', 'stack', 'ball', 'book', 'present', 'lollipop', 'star', 'teddy', 'cone'] as const;
const decoyColors = [PALETTE.pink, PALETTE.yellow, PALETTE.cyan, PALETTE.green, PALETTE.purple, PALETTE.orange];
let k = 0;
for (const a of SHELVES) {
  for (let level = 0; level < 4; level++) {
    for (const off of [-1.1, 0, 1.1]) {
      if ((k * 7 + level) % 3 === 0) {
        k++;
        continue;
      }
      const s = shelf(a, level, off);
      const kind = decoyKinds[k % decoyKinds.length];
      decor.push({
        kind,
        pos: s.pos,
        rotY: (s.rotY ?? 0) + (k % 3) * 0.4,
        color: kind === 'teddy' ? '#b5733c' : decoyColors[k % decoyColors.length],
        accent: decoyColors[(k + 2) % decoyColors.length],
        scale: kind === 'teddy' ? 0.8 : 1,
        occludes: true,
      });
      k++;
    }
  }
}
decor.push(
  { kind: 'table', pos: TABLE, color: PALETTE.yellow, accent: PALETTE.purple, scale: 1.1 },
  { kind: 'chair', pos: [TABLE[0] + 0.9, 0, TABLE[2] + 0.5], rotY: -2, color: PALETTE.pink, accent: '#ffffff' },
  { kind: 'chair', pos: [TABLE[0] - 0.9, 0, TABLE[2] - 0.4], rotY: 1.2, color: PALETTE.cyan, accent: '#ffffff' },
  { kind: 'present', pos: [TABLE[0] - 0.2, 0.6, TABLE[2] + 0.25], color: PALETTE.pink, accent: PALETTE.yellow },
  { kind: 'lollipop', pos: [TABLE[0] + 0.3, 0.6, TABLE[2] - 0.3], color: PALETTE.green, accent: '#ffffff' },
  { kind: 'toybox', pos: polar(200, 6.2, 0), rotY: facing(200), color: PALETTE.orange, accent: PALETTE.yellow, scale: 1.3 },
  { kind: 'toybox', pos: polar(330, 6.4, 0), rotY: facing(330), color: PALETTE.purple, accent: PALETTE.pink, scale: 1.2 },
  // Pilhas de almofadas (escondem coisas atrás)
  { kind: 'cushion', pos: polar(30, 6.3, 0), color: PALETTE.pink, scale: 1.3 },
  { kind: 'cushion', pos: polar(30, 6.3, 0.45), rotY: 0.5, color: PALETTE.yellow, scale: 1.1 },
  { kind: 'cushion', pos: polar(160, 5.8, 0), color: PALETTE.cyan, scale: 1.4 },
  { kind: 'cushion', pos: polar(160, 5.8, 0.48), rotY: 0.3, color: PALETTE.green, scale: 1.1 },
  { kind: 'cushion', pos: polar(160, 5.8, 0.85), rotY: 0.8, color: PALETTE.purple, scale: 0.8 },
  { kind: 'cushion', pos: polar(280, 5.6, 0), color: PALETTE.orange, scale: 1.3 },
  { kind: 'plant', pos: polar(90, 8.8, 0), color: PALETTE.pink, scale: 1.6 },
  { kind: 'plant', pos: polar(270, 8.8, 0), color: PALETTE.yellow, scale: 1.6 },
  { kind: 'lamp', pos: polar(15, 7, 0), color: PALETTE.yellow, accent: PALETTE.purple, scale: 1.6 },
  { kind: 'lamp', pos: polar(255, 7.2, 0), color: PALETTE.pink, accent: PALETTE.cyan, scale: 1.6 },
  { kind: 'balloon', pos: polar(70, 7.6, 1.6), color: PALETTE.pink, occludes: false },
  { kind: 'balloon', pos: polar(75, 7.4, 1.9), color: PALETTE.cyan, occludes: false },
  { kind: 'balloon', pos: polar(215, 7.6, 1.7), color: PALETTE.yellow, occludes: false },
  { kind: 'balloon', pos: polar(290, 7.8, 2.0), color: PALETTE.green, occludes: false },
  { kind: 'ball', pos: polar(120, 3.5, 0), color: PALETTE.green, accent: '#ffffff', scale: 1.4 },
  { kind: 'ball', pos: polar(250, 3.2, 0), color: PALETTE.purple, accent: PALETTE.yellow, scale: 1.2 },
  { kind: 'stack', pos: polar(45, 3.8, 0), color: PALETTE.pink, accent: PALETTE.yellow, scale: 1.5 },
  { kind: 'block', pos: polar(185, 3.6, 0), color: PALETTE.cyan, scale: 1.3 },
  { kind: 'block', pos: polar(188, 3.9, 0), color: PALETTE.pink, scale: 1.3 },
  { kind: 'block', pos: polar(186, 3.75, 0.29), color: PALETTE.yellow, scale: 1.3 },
);

// ------------------------------------------------------------------ objetos do Jhow
const targets: HiddenTarget[] = [
  { id: 'headphones', name: 'Headphone do Jhow', icon: '🎧', kind: 'headphones', color: '#1d1d24', accent: PALETTE.purple, scale: 1.3, spots: [shelf(55, 3, 0.2), onTable(-0.35, -0.2), floor(200, 6.2, 0.62)] },
  { id: 'sneaker', name: 'Tênis do Jhow', icon: '👟', kind: 'sneaker', color: '#1fd6c9', accent: '#ffffff', scale: 1.2, spots: [floor(151, 6.5, 0, 0.8), shelf(305, 0, -0.9), floor(288, 6.4, 0)] },
  { id: 'car', name: 'Carrinho', icon: '🚗', kind: 'car', color: PALETTE.orange, accent: PALETTE.cyan, scale: 1.1, spots: [shelf(125, 1, 0.9), floor(80, 5.6, 0, 1.2), shelf(0, 0, -0.2)] },
  { id: 'duck', name: 'Patinho', icon: '🦆', kind: 'duck', color: '#ffd60a', spots: [shelf(235, 2, 1.1), onTable(0.35, 0.3), floor(330, 6.4, 0.62)] },
  { id: 'yoyo', name: 'Ioiô', icon: '🪀', kind: 'yoyo', color: PALETTE.pink, accent: PALETTE.purple, scale: 1.3, spots: [shelf(0, 3, 1.0), shelf(125, 2, -0.3), floor(38, 6.7, 0)] },
  { id: 'rocket', name: 'Foguete', icon: '🚀', kind: 'rocket', color: PALETTE.pink, accent: PALETTE.yellow, spots: [shelf(305, 2, 0.4), floor(225, 4.6, 0), shelf(55, 0, 1.1)] },
  { id: 'robot', name: 'Robô', icon: '🤖', kind: 'robot', color: '#b9c3d6', accent: PALETTE.cyan, spots: [shelf(235, 0, -0.1), floor(15, 5.2, 0, 0.5), floor(140, 7.4, 0)] },
  { id: 'dino', name: 'Dinossauro', icon: '🦖', kind: 'dino', color: PALETTE.green, accent: PALETTE.yellow, scale: 1.2, spots: [floor(170, 6.9, 0, 1.5), shelf(125, 3, 0.6), floor(260, 4.8, 0)] },
  { id: 'guitar', name: 'Guitarrinha', icon: '🎸', kind: 'guitar', color: PALETTE.orange, spots: [floor(345, 8.0, 0), shelf(0, 1, 0.3), floor(110, 7.8, 0)] },
  { id: 'cap', name: 'Boné', icon: '🧢', kind: 'cap', color: PALETTE.purple, accent: PALETTE.yellow, scale: 1.3, spots: [floor(30, 6.3, 0.9), shelf(305, 3, -0.6), floor(205, 4.4, 0, 0.6)] },
  { id: 'trophy', name: 'Troféu', icon: '🏆', kind: 'trophy', color: '#ffc928', scale: 1.4, spots: [shelf(55, 1, -0.9), shelf(235, 3, 0.2), floor(70, 6.8, 0)] },
];

export const HIDDEN_W1_L02: HiddenRoomData = {
  id: 'w1_l02',
  music: 'world1',
  intro: 'Eu perdi umas coisas aqui na sala de brinquedos! Vamos encontrar? Arraste para olhar em volta e toque no que achar!',
  background: '#efe4ff',
  room: {
    radius: 9.6,
    height: 6,
    wallColors: [PALETTE.purpleLight, '#ffc6e6', '#b8f5d2', '#ffe9a8', '#bfe9ff'],
    floorColors: ['#f3e9ff', '#e1cfff'],
  },
  camera: { height: 1.9 },
  decor,
  targets,
  counts: { sloth: 5, monkey: 7, jaguar: 8 },
  hints: { sloth: Infinity, monkey: 3, jaguar: 1 },
  bonus: { id: 'gold_teddy_l02', spots: [floor(240, 7.6, 0.2), shelf(0, 2, -1.1), floor(138, 8.2, 0)] },
  coins: [polar(10, 4.6, 0.3), polar(80, 7.5, 2.4), polar(140, 3.2, 0.3), polar(170, 8.8, 3.6), polar(200, 3.8, 0.3), polar(250, 8.2, 2.8), polar(320, 4.2, 0.3), polar(350, 8.6, 2.2)],
  showTimer: ['jaguar'],
};
