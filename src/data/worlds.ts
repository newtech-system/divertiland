import type { LevelData, WorldDef } from './levelTypes';

/**
 * MUNDO 1 — DIVERTILAND
 *
 * Ordem ajustada em relação à proposta inicial, por motivo de game design:
 * a fase seguinte SEMPRE muda de mecânica ("Essa não é igual à anterior!").
 * 1 Exploração 3D → 2 Objetos escondidos → 3 Runner → 4 Puzzle (desafio especial)
 * → 5 Parkour → 6 Plataforma 2D → 7 Trampolim → 8 Chão é Lava → 9 Narrativa longa
 * → 10 Fase bônus. Uma fase secreta é aberta por um segredo da Fase 1.
 */
const W1 = 'world1';

const levels: LevelData[] = [
  {
    id: 'w1_l01',
    worldId: W1,
    order: 1,
    name: 'Bem-vindo à Divertiland',
    tagline: 'Explore túneis, redes e trampolins!',
    icon: '🏰',
    type: 'exploration3D',
    size: 'main',
    skillFocus: ['spatial_awareness', 'coordination', 'decision_making'],
    guide: 'jhow',
    unlock: {},
    objectives: [
      { id: 'coins', type: 'coinsRatio', ratio: 0.7, icon: '🪙', label: 'Pegue muitos Divertis' },
      { id: 'secret', type: 'secret', secretId: 'w1_l01_secret_room', icon: '🔍', label: 'Ache a sala secreta' },
      { id: 'teddies', type: 'collectibles', count: 3, icon: '🧸', label: 'Encontre 3 ursinhos dourados' },
    ],
    rewardItemOnThreeStars: 'head_crown',
    contentId: 'w1_l01',
    implemented: true,
    map: { x: 50, y: 0, style: 'normal' },
  },
  {
    id: 'w1_l02',
    worldId: W1,
    order: 2,
    name: 'Cadê o Brinquedo?',
    tagline: 'O Jhow perdeu umas coisas. Vamos achar?',
    icon: '🔎',
    type: 'hiddenObjects',
    size: 'short',
    skillFocus: ['observation', 'attention'],
    guide: 'jhow',
    unlock: { afterLevels: ['w1_l01'] },
    objectives: [
      { id: 'nohint', type: 'flag', flag: 'fewHints', icon: '💡', label: 'Use no máximo 1 dica' },
      { id: 'bonus', type: 'collectibles', count: 1, icon: '🧸', label: 'Ache o ursinho escondido' },
      { id: 'fast', type: 'timeUnder', seconds: 120, icon: '⏱️', label: 'Termine em 2 minutos' },
    ],
    contentId: 'w1_l02',
    implemented: true,
    map: { x: 26, y: 1, style: 'normal' },
  },
  {
    id: 'w1_l03',
    worldId: W1,
    order: 3,
    name: 'Corredor Maluco',
    tagline: 'Corra, desvie e pegue Divertis!',
    icon: '🏃',
    type: 'runner',
    size: 'short',
    skillFocus: ['attention', 'coordination'],
    guide: 'mina',
    unlock: { afterLevels: ['w1_l02'] },
    objectives: [
      { id: 'coins', type: 'coinsRatio', ratio: 0.6, icon: '🪙', label: 'Pegue muitos Divertis' },
      { id: 'nohit', type: 'flag', flag: 'fewHits', icon: '💪', label: 'Bata no máximo 2 vezes' },
      { id: 'gems', type: 'collectibles', count: 3, icon: '💎', label: 'Pegue 3 gemas' },
    ],
    contentId: 'w1_l03',
    implemented: true,
    map: { x: 40, y: 2, style: 'normal' },
  },
  {
    id: 'w1_l04',
    worldId: W1,
    order: 4,
    name: 'Porta Misteriosa',
    tagline: 'Descubra o segredo para abrir a porta!',
    icon: '🚪',
    type: 'puzzle',
    size: 'short',
    skillFocus: ['logic', 'memory'],
    guide: 'mina',
    unlock: { afterLevels: ['w1_l03'] },
    objectives: [
      { id: 'nohint', type: 'flag', flag: 'fewHints', icon: '💡', label: 'Use no máximo 1 dica' },
      { id: 'clean', type: 'flag', flag: 'fewMistakes', icon: '🎯', label: 'Erre no máximo 2 vezes' },
      { id: 'fast', type: 'timeUnder', seconds: 150, icon: '⏱️', label: 'Termine rapidinho' },
    ],
    contentId: 'w1_l04',
    implemented: true,
    map: { x: 70, y: 3, style: 'special' },
  },
  {
    id: 'w1_l05',
    worldId: W1,
    order: 5,
    name: 'Circuito das Redes',
    tagline: 'Plataformas, redes e obstáculos malucos!',
    icon: '🕸️',
    type: 'parkour',
    size: 'normal',
    skillFocus: ['coordination', 'persistence'],
    guide: 'jhow',
    unlock: { afterLevels: ['w1_l04'] },
    objectives: [
      { id: 'coins', type: 'coinsRatio', ratio: 0.7, icon: '🪙', label: 'Pegue muitos Divertis' },
      { id: 'teddies', type: 'collectibles', count: 3, icon: '🧸', label: 'Encontre 3 ursinhos dourados' },
      { id: 'fast', type: 'timeUnder', seconds: 240, icon: '⏱️', label: 'Termine em 4 minutos' },
    ],
    contentId: 'w1_l05',
    implemented: true,
    map: { x: 44, y: 4, style: 'normal' },
  },
  {
    id: 'w1_l06',
    worldId: W1,
    order: 6,
    name: 'Caça aos Divertis',
    tagline: 'Uma aventura de lado, cheia de moedas!',
    icon: '🪙',
    type: 'platformer2D',
    size: 'normal',
    skillFocus: ['observation', 'planning'],
    guide: 'mina',
    unlock: { afterLevels: ['w1_l05'] },
    objectives: [
      { id: 'coins', type: 'coinsRatio', ratio: 0.8, icon: '🪙', label: 'Pegue quase todos os Divertis' },
      { id: 'secret', type: 'secret', secretId: 'w1_l06_secret', icon: '🔍', label: 'Ache a passagem secreta' },
      { id: 'teddies', type: 'collectibles', count: 3, icon: '🧸', label: 'Encontre 3 ursinhos dourados' },
    ],
    contentId: 'w1_l06',
    implemented: true,
    map: { x: 22, y: 5, style: 'normal' },
  },
  {
    id: 'w1_l07',
    worldId: W1,
    order: 7,
    name: 'Trampolim nas Alturas',
    tagline: 'Pule cada vez mais alto!',
    icon: '🤸',
    type: 'trampoline',
    size: 'normal',
    skillFocus: ['coordination', 'spatial_awareness'],
    guide: 'jhow',
    unlock: { afterLevels: ['w1_l06'] },
    objectives: [
      { id: 'coins', type: 'coinsRatio', ratio: 0.7, icon: '🪙', label: 'Pegue muitos Divertis' },
      { id: 'targets', type: 'collectibles', count: 5, icon: '🎯', label: 'Acerte 5 alvos' },
      { id: 'secret', type: 'secret', secretId: 'w1_l07_secret', icon: '🔍', label: 'Ache a nuvem secreta' },
    ],
    contentId: 'w1_l07',
    implemented: true,
    map: { x: 52, y: 6, style: 'normal' },
  },
  {
    id: 'w1_l08',
    worldId: W1,
    order: 8,
    name: 'O Chão é Lava!',
    tagline: 'Não pise no chão colorido!',
    icon: '🌋',
    type: 'floorIsLava',
    size: 'normal',
    skillFocus: ['planning', 'coordination'],
    guide: 'mina',
    unlock: { afterLevels: ['w1_l07'] },
    objectives: [
      { id: 'coins', type: 'coinsRatio', ratio: 0.7, icon: '🪙', label: 'Pegue muitos Divertis' },
      { id: 'nofall', type: 'flag', flag: 'fewFalls', icon: '🦶', label: 'Caia no máximo 2 vezes' },
      { id: 'teddies', type: 'collectibles', count: 3, icon: '🧸', label: 'Encontre 3 ursinhos dourados' },
    ],
    contentId: 'w1_l08',
    implemented: true,
    map: { x: 76, y: 7, style: 'normal' },
  },
  {
    id: 'w1_l09',
    worldId: W1,
    order: 9,
    name: 'O Ursinho Perdido',
    tagline: 'Siga as pistas e ajude a encontrar o ursinho!',
    icon: '🧸',
    type: 'narrative',
    size: 'main',
    skillFocus: ['empathy', 'decision_making', 'observation'],
    guide: 'mina',
    unlock: { afterLevels: ['w1_l08'] },
    objectives: [
      { id: 'clues', type: 'collectibles', count: 5, icon: '🐾', label: 'Ache todas as pistas' },
      { id: 'helpers', type: 'flag', flag: 'helpedEveryone', icon: '💛', label: 'Ajude todos os amigos' },
      { id: 'secret', type: 'secret', secretId: 'w1_l09_secret', icon: '🔍', label: 'Ache o esconderijo secreto' },
    ],
    contentId: 'w1_l09',
    implemented: true,
    map: { x: 48, y: 8, style: 'normal' },
  },
  {
    id: 'w1_l10',
    worldId: W1,
    order: 10,
    name: 'Super Desafio Divertiland',
    tagline: 'Tudo junto: explorar, pular, correr e pensar!',
    icon: '🏆',
    type: 'bonusMix',
    size: 'bonus',
    skillFocus: ['persistence', 'coordination', 'logic'],
    guide: 'jhow',
    unlock: { afterLevels: ['w1_l09'], minStars: 20 },
    objectives: [
      { id: 'coins', type: 'coinsRatio', ratio: 0.7, icon: '🪙', label: 'Pegue muitos Divertis' },
      { id: 'secret', type: 'secret', secretId: 'w1_l10_secret', icon: '🔍', label: 'Ache a sala secreta' },
      { id: 'teddies', type: 'collectibles', count: 5, icon: '🧸', label: 'Encontre 5 ursinhos dourados' },
    ],
    contentId: 'w1_l10',
    implemented: true,
    map: { x: 50, y: 9.2, style: 'bonus' },
  },
  {
    id: 'w1_s01',
    worldId: W1,
    order: 99,
    name: 'Pega-Pega Secreto',
    tagline: 'Uma fase secreta! Pegue os amigos que fogem!',
    icon: '🙈',
    type: 'hideAndSeek',
    size: 'short',
    skillFocus: ['observation', 'spatial_awareness'],
    guide: 'mina',
    unlock: { secretId: 'w1_l01_secret_room' },
    objectives: [
      { id: 'all', type: 'collectibles', count: 5, icon: '🙌', label: 'Pegue todos os amigos' },
      { id: 'fast', type: 'timeUnder', seconds: 120, icon: '⏱️', label: 'Termine em 2 minutos' },
      { id: 'coins', type: 'coinsRatio', ratio: 0.7, icon: '🪙', label: 'Pegue muitos Divertis' },
    ],
    contentId: 'w1_s01',
    implemented: true,
    map: { x: 84, y: 0.6, style: 'secret' },
  },
];

export const WORLDS: WorldDef[] = [
  {
    id: W1,
    name: 'Divertiland',
    subtitle: 'O Mundo da Diversão',
    icon: '🎪',
    colors: { primary: '#7b2cff', secondary: '#ff3d9a', accent: '#39ff88' },
    musicId: 'world1',
    levels,
    chests: [
      { id: 'w1_chest_1', stars: 5, divertis: 30, itemId: 'top_tee_gold', map: { x: 82, y: 2.4 } },
      { id: 'w1_chest_2', stars: 12, divertis: 60, itemId: 'back_wings', map: { x: 16, y: 6.4 } },
      { id: 'w1_chest_3', stars: 24, divertis: 120, itemId: 'skin_golden', map: { x: 80, y: 8.7 } },
    ],
  },
];

export const ALL_LEVELS: LevelData[] = WORLDS.flatMap((w) => w.levels);

export function getLevel(id: string): LevelData | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

export function getWorld(id: string): WorldDef | undefined {
  return WORLDS.find((w) => w.id === id);
}

/** Próxima fase na ordem do mundo (ignora fases secretas). */
export function getNextLevel(id: string): LevelData | undefined {
  const lvl = getLevel(id);
  if (!lvl) return undefined;
  const world = getWorld(lvl.worldId);
  return world?.levels.filter((l) => l.map.style !== 'secret').find((l) => l.order === lvl.order + 1);
}
