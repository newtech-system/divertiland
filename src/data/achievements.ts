/**
 * Conquistas (seção 45). Poucas e significativas no início.
 * Condições são avaliadas pelo AchievementSystem a partir do perfil — sem lógica espalhada.
 */
export type AchievementCondition =
  | { type: 'levelsCompleted'; count: number }
  | { type: 'totalEarned'; amount: number }
  | { type: 'totalStars'; count: number }
  | { type: 'secretsFound'; count: number }
  | { type: 'itemsOwned'; count: number }
  | { type: 'stat'; key: string; value: number }
  /** Aventuras (das cinco) concluídas pelo menos uma vez. */
  | { type: 'adventuresCompleted'; count: number }
  /** Ursinhos dourados na coleção permanente (máximo 15). */
  | { type: 'goldensFound'; count: number };

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  reward: number;
  condition: AchievementCondition;
  /**
   * Patente pessoal que esta conquista representa (seção 17.3). Mede a jornada da
   * criança — nunca o valor dela, a inteligência ou a bondade.
   */
  rank?: 'Explorador' | 'Descobridor' | 'Construtor' | 'Guardião da Diversão';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Revisadas no Marco 2 (seção 17.3): com CINCO aventuras e 15 estrelas, as metas
  // antigas de "10 fases" e "30 estrelas" eram impossíveis. Agora são marcos reais.
  { id: 'first_adventure', name: 'Primeira Aventura', icon: '\u{1F392}', description: 'Concluir a sua primeira aventura.', reward: 20, condition: { type: 'adventuresCompleted', count: 1 }, rank: 'Explorador' },
  { id: 'divertis_100', name: '100 Divertis', icon: '\u{1FA99}', description: 'Ganhar 100 Divertis no total.', reward: 15, condition: { type: 'totalEarned', amount: 100 } },
  { id: 'secret_hunter', name: 'Caçador de Segredos', icon: '\u{1F50D}', description: 'Descobrir 3 segredos.', reward: 40, condition: { type: 'secretsFound', count: 3 }, rank: 'Descobridor' },
  { id: 'adventures_3', name: 'Três Aventuras', icon: '\u{1F5FA}\u{FE0F}', description: 'Concluir 3 das 5 aventuras.', reward: 80, condition: { type: 'adventuresCompleted', count: 3 }, rank: 'Descobridor' },
  { id: 'adventures_all', name: 'Guardião da Diversão', icon: '\u{1F6E1}\u{FE0F}', description: 'Concluir as cinco aventuras.', reward: 150, condition: { type: 'adventuresCompleted', count: 5 }, rank: 'Guardião da Diversão' },
  { id: 'stars_8', name: '8 Estrelas', icon: '\u{2B50}', description: 'Juntar 8 das 15 estrelas.', reward: 60, condition: { type: 'totalStars', count: 8 } },
  { id: 'stars_15', name: 'Todas as Estrelas', icon: '\u{1F31F}', description: 'Juntar as 15 estrelas da campanha.', reward: 150, condition: { type: 'totalStars', count: 15 } },
  { id: 'goldens_3', name: 'Primeira Coleção', icon: '\u{1F9F8}', description: 'Achar 3 ursinhos dourados.', reward: 50, condition: { type: 'goldensFound', count: 3 }, rank: 'Descobridor' },
  { id: 'goldens_15', name: 'Álbum Completo', icon: '\u{1F3C5}', description: 'Achar os 15 ursinhos dourados.', reward: 200, condition: { type: 'goldensFound', count: 15 }, rank: 'Guardião da Diversão' },
  { id: 'trampoline_master', name: 'Mestre do Trampolim', icon: '\u{1F938}', description: 'Dar 25 pulos em trampolins.', reward: 30, condition: { type: 'stat', key: 'trampolineBounces', value: 25 } },
  { id: 'explorer', name: 'Explorador Divertiland', icon: '\u{1F9ED}', description: 'Pegar todos os Divertis de uma fase.', reward: 40, condition: { type: 'stat', key: 'perfectCoinLevels', value: 1 }, rank: 'Explorador' },
  { id: 'stylish', name: 'Estilo Próprio', icon: '\u{1F60E}', description: 'Comprar o primeiro item na loja.', reward: 10, condition: { type: 'stat', key: 'itemsPurchased', value: 1 } },
  { id: 'builder', name: 'Construtor', icon: '\u{1F3D7}\u{FE0F}', description: 'Montar o seu primeiro cantinho no Meu Mundo.', reward: 40, condition: { type: 'stat', key: 'worldItemsPlaced', value: 5 }, rank: 'Construtor' },
];

/** Patentes pessoais na ordem da jornada (seção 17.3). */
export const RANKS = ['Explorador', 'Descobridor', 'Construtor', 'Guardião da Diversão'] as const;


export function getAchievement(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
