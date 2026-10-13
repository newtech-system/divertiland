import type { CharacterId, DifficultyId, SkillFocus } from '../core/types';
import type { ObjectiveDef, UnlockRule } from './levelTypes';

/**
 * AS CINCO AVENTURAS (seção 8 do prompt mestre V2).
 *
 * O escopo do jogo passa a ser **cinco aventuras grandes e diferentes entre si** mais o
 * **Meu Mundo Divertiland**. A lista antiga de dez fases pequenas deixa de definir o
 * escopo: as fases que já existem continuam vivas como *etapas* das aventuras (seção
 * 24.1: "preserve o que funciona"), e vão sendo substituídas pelo conteúdo definitivo
 * aventura por aventura.
 *
 * Cada aventura tem:
 *  - 4 a 6 **etapas internas** conectadas, com começo, desenvolvimento e desfecho;
 *  - **3 estrelas** permanentes, cada uma com um objetivo visível (nunca só velocidade);
 *  - **3 ursinhos dourados** de identidade permanente (15 no total, seção 17.1);
 *  - o **aprendizado vivido**: habilidade, valor humano, ação concreta, consequência,
 *    fala contextual e como verificar (seção 15 — isso é obrigatório nos dados).
 */

export type AdventureId = 'a01' | 'a02' | 'a03' | 'a04' | 'a05';

/** Etapa interna: o que a criança faz e o que muda no mundo quando ela termina. */
export interface AdventureStage {
  id: string;
  name: string;
  /** Texto curto da missão atual, mostrado no HUD e no mapa. */
  mission: string;
  /** O que MUDA no mundo ao concluir (seção 8). */
  outcome: string;
}

/**
 * Uma "jogada" da aventura: uma fase que roda de verdade e as etapas que ela cobre.
 * Uma aventura pode ser uma jogada só (a A01 é um parque inteiro com 6 etapas internas)
 * ou uma sequência (a A02 é a caça a objetos + a porta dos mecanismos).
 */
export interface AdventureRun {
  levelId: string;
  stages: string[];
  /** true = conteúdo ainda provisório (vem da fase antiga), será reconstruído. */
  provisional?: boolean;
}

/** Ursinho dourado: a identidade é PERMANENTE; `from` diz onde ele está hoje. */
export interface GoldenTeddy {
  id: string;
  hint: string;
  /** Id do colecionável no conteúdo atual. Sem isso, ainda não foi colocado no jogo. */
  from?: string;
}

/** O que a aventura ensina, de forma verificável (seção 15). */
export interface AdventureLearning {
  skill: SkillFocus[];
  /** Valor humano trabalhado. */
  value: string;
  /** A ação concreta que representa esse valor (não é frase solta no final). */
  action: string;
  /** O que acontece na história por causa dessa ação. */
  consequence: string;
  /** Fala contextual do guia. */
  line: string;
  /** Como o jogo VERIFICA que a criança fez isso. */
  verify: string;
}

export interface AdventureDef {
  id: AdventureId;
  order: number;
  name: string;
  tagline: string;
  icon: string;
  /** Premissa em uma frase, para o cartão da aventura. */
  premise: string;
  guide: CharacterId;
  unlock: UnlockRule;
  stages: AdventureStage[];
  runs: AdventureRun[];
  /** Estrela 1 é sempre "concluir a aventura". Estas são as estrelas 2 e 3. */
  bonusObjectives: ObjectiveDef[];
  goldens: GoldenTeddy[];
  learning: AdventureLearning;
  /** Peça temática que a aventura libera para o Meu Mundo (seção 14.4). */
  worldPiece: { id: string; name: string; icon: string };
  /** Tamanho para a economia (ver data/economy.ts). */
  size: 'short' | 'normal' | 'main';
  map: { x: number; y: number; style: 'normal' | 'special' };
  /** false = ainda tem etapa com conteúdo provisório; o mapa avisa com honestidade. */
  finalContent: boolean;
}

const st = (id: string, name: string, mission: string, outcome: string): AdventureStage => ({ id, name, mission, outcome });

export const ADVENTURES: AdventureDef[] = [
  // ------------------------------------------------------------------ A01
  {
    id: 'a01',
    order: 1,
    name: 'O Ursinho e o Caminho da Gentileza',
    tagline: 'Uma criança perdeu o ursinho dela. Vamos ajudar?',
    icon: '🧸',
    premise:
      'O Jhow e a Mina recebem você na Divertiland. No meio da brincadeira, uma criança está triste: ' +
      'perdeu o ursinho de estimação. Você acolhe, procura e devolve.',
    guide: 'jhow',
    unlock: {},
    stages: [
      st('a01_e1', 'Chegar e aprender', 'Vá até o Jhow e diga oi', 'Você aprende a andar, pegar e pular num lugar seguro.'),
      st('a01_e2', 'Perceber e acolher', 'Converse com a criança triste', 'Ela conta o que aconteceu e mostra como é o ursinho.'),
      st('a01_e3', 'Encontrar pistas', 'Siga as pistas do ursinho', 'As pistas mostram por onde o ursinho passou.'),
      st('a01_e4', 'Preparar um caminho', 'Abra o caminho para a área tranquila', 'Um apoio se encaixa e a passagem abre.'),
      st('a01_e5', 'Encontrar e devolver', 'Leve o ursinho de volta', 'A criança reencontra o ursinho dela.'),
      st('a01_e6', 'Celebrar a ação', 'Veja o que o seu cuidado fez', 'A saída da missão abre e todos comemoram.'),
    ],
    runs: [{ levelId: 'a01', stages: ['a01_e1', 'a01_e2', 'a01_e3', 'a01_e4', 'a01_e5', 'a01_e6'] }],
    bonusObjectives: [
      { id: 'a01_ajuda', type: 'flag', flag: 'helpedExtra', icon: '🤝', label: 'Faça uma ajuda a mais no parque' },
      { id: 'a01_segredo', type: 'secret', secretId: 'a01_sala_secreta', icon: '🔍', label: 'Descubra a sala secreta' },
    ],
    goldens: [
      { id: 'a01_urso_1', hint: 'Quem olha para cima encontra.', from: 'a01_urso_1' },
      { id: 'a01_urso_2', hint: 'Fica num desvio do caminho principal.', from: 'a01_urso_2' },
      { id: 'a01_urso_3', hint: 'Só aparece para quem segue as três pistas.', from: 'a01_urso_3' },
    ],
    learning: {
      skill: ['observation', 'empathy', 'spatial_awareness'],
      value: 'Gentileza',
      action: 'Ouvir uma criança triste, procurar o brinquedo dela e devolver nas mãos dela.',
      consequence: 'A criança para de chorar, agradece e volta a brincar; a saída da missão se abre.',
      line: 'Você percebeu que alguém precisava de ajuda. Seu cuidado fez diferença.',
      verify: 'A entrega é uma interação visível com o personagem (etapa a01_e5 concluída).',
    },
    worldPiece: { id: 'world_recanto_ursinho', name: 'Recanto do Ursinho', icon: '🧸' },
    size: 'main',
    map: { x: 50, y: 0, style: 'normal' },
    finalContent: true,
  },

  // ------------------------------------------------------------------ A02
  {
    id: 'a02',
    order: 2,
    name: 'A Casa dos Mistérios',
    tagline: 'Ache os brinquedos e descubra como abrir a porta especial.',
    icon: '🔎',
    premise:
      'O Jhow e a Mina estão arrumando um espaço de brincadeiras para receber amigos. ' +
      'As coisas importantes se espalharam, e a porta de uma sala especial só abre com pistas.',
    guide: 'mina',
    unlock: { afterLevels: ['a01'] },
    stages: [
      st('a02_e1', 'Aprender a procurar', 'Toque no brinquedo igual ao da lista', 'Você aprende a comparar e tocar no objeto certo.'),
      st('a02_e2', 'Investigar a primeira sala', 'Ache os objetos da sala de brinquedos', 'Um dos objetos revela a primeira pista da porta.'),
      st('a02_e3', 'Explorar outro ambiente', 'Procure no cantinho de histórias', 'A passagem para a oficina se abre.'),
      st('a02_e4', 'Resolver os três mecanismos', 'Abra os três cadeados da porta', 'Cada cadeado abre de verdade e muda de ícone.'),
      st('a02_e5', 'Entrar na sala revelada', 'Prepare a sala para os amigos', 'A sala especial é revelada e fica pronta para a visita.'),
    ],
    runs: [
      { levelId: 'w1_l02', stages: ['a02_e1', 'a02_e2', 'a02_e3'], provisional: true },
      { levelId: 'w1_l04', stages: ['a02_e4', 'a02_e5'], provisional: true },
    ],
    bonusObjectives: [
      { id: 'a02_organizar', type: 'collectibles', count: 1, icon: '🧺', label: 'Ache o objeto escondido extra' },
      { id: 'a02_poucas_dicas', type: 'flag', flag: 'fewHints', icon: '💡', label: 'Resolva com no máximo 1 dica' },
    ],
    goldens: [
      { id: 'a02_urso_1', hint: 'Está entre os brinquedos da primeira sala.', from: 'gold_teddy_l02' },
      { id: 'a02_urso_2', hint: 'Entra com a reconstrução do cantinho de histórias.' },
      { id: 'a02_urso_3', hint: 'Entra com a reconstrução da oficina da imaginação.' },
    ],
    learning: {
      skill: ['observation', 'attention', 'logic'],
      value: 'Cuidado e gratidão',
      action: 'Devolver cada objeto ao lugar para que outras pessoas também possam brincar.',
      consequence: 'A sala fica pronta para receber os amigos e a porta especial se abre.',
      line: 'Quando a gente guarda as coisas no lugar, todo mundo consegue brincar depois.',
      verify: 'Cada objeto marcado na lista e os três cadeados abertos.',
    },
    worldPiece: { id: 'world_estante_descobertas', name: 'Estante das Descobertas', icon: '📚' },
    size: 'normal',
    map: { x: 24, y: 1, style: 'normal' },
    finalContent: false,
  },

  // ------------------------------------------------------------------ A03
  {
    id: 'a03',
    order: 3,
    name: 'Expresso da Alegria',
    tagline: 'Leve as peças da festa pelos caminhos da Divertiland!',
    icon: '🏃',
    premise:
      'Os amigos estão chegando e falta levar as peças de uma atividade do parque. ' +
      'Você corre pelos caminhos, escolhe rotas e faz as entregas.',
    guide: 'mina',
    unlock: { afterLevels: ['a02'] },
    stages: [
      st('a03_e1', 'Treino sem risco', 'Treine trocar de faixa, pular e abaixar', 'Você domina os três comandos antes de qualquer obstáculo.'),
      st('a03_e2', 'Primeira entrega', 'Leve a primeira peça', 'O primeiro destinatário recebe a peça.'),
      st('a03_e3', 'Escolha de rota', 'Siga a pista na bifurcação', 'O caminho certo abre um atalho.'),
      st('a03_e4', 'Brinquedos em sequência', 'Passe pelo escorregador e pelo túnel', 'A rota dos brinquedos fica liberada.'),
      st('a03_e5', 'Entrega colaborativa', 'Ajude quem deixou a peça cair', 'A peça perdida volta para a festa.'),
      st('a03_e6', 'Chegada e verificação', 'Entregue tudo na área da festa', 'A atividade fica pronta para os amigos.'),
    ],
    runs: [{ levelId: 'w1_l03', stages: ['a03_e1', 'a03_e2', 'a03_e3', 'a03_e4', 'a03_e5', 'a03_e6'], provisional: true }],
    bonusObjectives: [
      { id: 'a03_pecas', type: 'collectibles', count: 3, icon: '🎁', label: 'Leve as 3 peças da festa' },
      { id: 'a03_cuidado', type: 'flag', flag: 'fewHits', icon: '💪', label: 'Chegue batendo no máximo 2 vezes' },
    ],
    goldens: [
      { id: 'a03_urso_1', hint: 'Fica num desvio sinalizado da pista.' },
      { id: 'a03_urso_2', hint: 'Entra com a reconstrução do escorregador.' },
      { id: 'a03_urso_3', hint: 'Entra com a reconstrução da área da festa.' },
    ],
    learning: {
      skill: ['attention', 'persistence', 'coordination'],
      value: 'Colaboração',
      action: 'Recolher a peça que caiu de outra pessoa e levar até o destino.',
      consequence: 'A atividade da festa fica completa porque alguém ajudou no caminho.',
      line: 'Podemos chegar juntos. Vamos ajudar a levar esta peça?',
      verify: 'Entregas registradas por destinatário (etapas a03_e2, a03_e5 e a03_e6).',
    },
    worldPiece: { id: 'world_decoracao_corrida', name: 'Decoração da Corrida', icon: '🎊' },
    size: 'normal',
    map: { x: 72, y: 2, style: 'normal' },
    finalContent: false,
  },

  // ------------------------------------------------------------------ A04
  {
    id: 'a04',
    order: 4,
    name: 'A Grande Travessia',
    tagline: 'Monte a ponte de brincadeiras para o grupo atravessar!',
    icon: '🌉',
    premise:
      'Um grupo precisa atravessar um circuito do parque. Você observa, planeja e prepara ' +
      'os apoios: plataformas, redes, trampolins e o chão que virou "lava" de geleia.',
    guide: 'jhow',
    unlock: { afterLevels: ['a03'] },
    stages: [
      st('a04_e1', 'Ler o percurso', 'Olhe o circuito antes de começar', 'Você escolhe quais apoios ativar primeiro.'),
      st('a04_e2', 'Preparar a travessia', 'Ative os apoios do primeiro trecho', 'As plataformas se posicionam e a rede abre.'),
      st('a04_e3', 'Atravessar brinquedos móveis', 'Passe pelas plataformas que se movem', 'O primeiro trecho da ponte fica pronto.'),
      st('a04_e4', 'Usar trampolins', 'Aprenda o impulso e alcance o alto', 'A rota de cima é liberada.'),
      st('a04_e5', 'Cruzar o chão é lava', 'Planeje os apoios e chegue à área segura', 'O acionador do grupo fica ao alcance.'),
      st('a04_e6', 'Ajudar a chegada', 'Abra a passagem final', 'O grupo atravessa pela ponte que você montou.'),
    ],
    runs: [
      { levelId: 'w1_l05', stages: ['a04_e1', 'a04_e2', 'a04_e3'], provisional: true },
      { levelId: 'w1_l07', stages: ['a04_e4'], provisional: true },
      { levelId: 'w1_l08', stages: ['a04_e5', 'a04_e6'], provisional: true },
    ],
    bonusObjectives: [
      { id: 'a04_apoios', type: 'collectibles', count: 3, icon: '🧩', label: 'Recupere as 3 peças de apoio' },
      { id: 'a04_moedas', type: 'coinsRatio', ratio: 0.6, icon: '🪙', label: 'Junte bastante Divertis no caminho' },
    ],
    goldens: [
      { id: 'a04_urso_1', hint: 'Num desvio das plataformas que andam.', from: 'p_teddy1' },
      { id: 'a04_urso_2', hint: 'Em cima da ponte de rede.', from: 'p_teddy2' },
      { id: 'a04_urso_3', hint: 'Depois dos discos que giram.', from: 'p_teddy3' },
    ],
    learning: {
      skill: ['spatial_awareness', 'persistence', 'decision_making'],
      value: 'Persistência e pedir ajuda',
      action: 'Observar antes de agir, tentar outro caminho e aceitar ajuda quando precisa.',
      consequence: 'O grupo atravessa por causa da ponte que a criança montou.',
      line: 'Pedir ajuda também é uma maneira de continuar.',
      verify: 'Apoios ativados e passagem final aberta (etapa a04_e6).',
    },
    worldPiece: { id: 'world_ponte_aventura', name: 'Ponte da Aventura', icon: '🌉' },
    size: 'main',
    map: { x: 30, y: 3, style: 'normal' },
    finalContent: false,
  },

  // ------------------------------------------------------------------ A05
  {
    id: 'a05',
    order: 5,
    name: 'Guardiões da Diversão',
    tagline: 'Monte a equipe, descubra o que aconteceu e faça a gincana!',
    icon: '🛡️',
    premise:
      'A gincana do parque precisa ser preparada. Você entra numa equipe, cumpre tarefas, ' +
      'compara pistas para descobrir quem trocou os símbolos de lugar — e a conclusão é acolhedora.',
    guide: 'mina',
    unlock: { afterLevels: ['a04'] },
    stages: [
      st('a05_e1', 'Formar equipe', 'Escolha o seu papel na equipe', 'A equipe fica montada com explorador, organizador e guardião.'),
      st('a05_e2', 'Preparar a arena', 'Cumpra as tarefas das áreas', 'A arena da gincana fica pronta.'),
      st('a05_e3', 'Investigar a troca', 'Compare as pistas', 'Você descobre quem trocou os símbolos — com evidência.'),
      st('a05_e4', 'Recuperar os emblemas', 'Pegue os emblemas no pega-pega', 'Os emblemas voltam para as bases.'),
      st('a05_e5', 'Gincana de equipes', 'Entregue os emblemas na base', 'A gincana acontece de verdade.'),
      st('a05_e6', 'Celebrar em conjunto', 'Veja a contribuição de cada um', 'A festa da gincana abre para todos.'),
    ],
    runs: [
      { levelId: 'w1_l09', stages: ['a05_e1', 'a05_e2', 'a05_e3'], provisional: true },
      { levelId: 'w1_s01', stages: ['a05_e4', 'a05_e5', 'a05_e6'], provisional: true },
    ],
    bonusObjectives: [
      { id: 'a05_cooperar', type: 'collectibles', count: 3, icon: '🤝', label: 'Cumpra 3 tarefas da equipe' },
      { id: 'a05_investigar', type: 'flag', flag: 'solvedMystery', icon: '🕵️', label: 'Resolva a investigação completa' },
    ],
    goldens: [
      { id: 'a05_urso_1', hint: 'Numa área opcional da arena.', from: 'u_paw1' },
      { id: 'a05_urso_2', hint: 'Perto da base de uma equipe.', from: 'u_paw2' },
      { id: 'a05_urso_3', hint: 'Só quem explora o esconderijo encontra.', from: 'u_paw3' },
    ],
    learning: {
      skill: ['cooperation', 'logic', 'observation'],
      value: 'Cooperação e justiça',
      action: 'Olhar as pistas antes de decidir e repartir o trabalho com a equipe.',
      consequence: 'A equipe termina a gincana e o erro é reparado sem acusar ninguém à toa.',
      line: 'Vamos olhar as pistas antes de decidir. Cada pessoa ajudou de um jeito.',
      verify: 'Investigação concluída com a pista correta e emblemas entregues.',
    },
    worldPiece: { id: 'world_bandeira_equipe', name: 'Bandeira da Equipe', icon: '🚩' },
    size: 'main',
    map: { x: 62, y: 4, style: 'special' },
    finalContent: false,
  },
];

export const ADVENTURE_IDS = ADVENTURES.map((a) => a.id);

/** Total da campanha: 5 aventuras × 3 estrelas = 15 (seção 17.2). */
export const MAX_CAMPAIGN_STARS = ADVENTURES.length * 3;
/** Total da coleção: 5 aventuras × 3 ursinhos = 15 (seção 17.1). */
export const MAX_GOLDEN_TEDDIES = ADVENTURES.length * 3;

export function getAdventure(id: string): AdventureDef | undefined {
  return ADVENTURES.find((a) => a.id === id);
}

/** A qual aventura pertence uma fase que está rodando. */
export function adventureOfLevel(levelId: string): AdventureDef | undefined {
  return ADVENTURES.find((a) => a.runs.some((r) => r.levelId === levelId));
}

/** Índice da jogada dentro da aventura (0 = primeira). */
export function runIndexOfLevel(adv: AdventureDef, levelId: string): number {
  return adv.runs.findIndex((r) => r.levelId === levelId);
}

/**
 * Traduz o id do colecionável do conteúdo para o id PERMANENTE do ursinho dourado.
 * É o que garante que mudar a posição (ou reconstruir a fase) não cria outro item
 * nem paga de novo (seções 17.1 e 22).
 */
export function goldenIdOf(adv: AdventureDef, contentId: string): string | null {
  return adv.goldens.find((g) => g.from === contentId)?.id ?? null;
}

/** Ursinhos que já existem no jogo (têm lugar definido no conteúdo atual). */
export function placedGoldens(adv: AdventureDef): GoldenTeddy[] {
  return adv.goldens.filter((g) => g.from);
}

/** Estilos em que a aventura foi concluída contam para o bônus de novo estilo. */
export interface AdventureProgressLike {
  completedDifficulties: DifficultyId[];
}
