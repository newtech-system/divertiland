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
  | { type: 'stat'; key: string; value: number };

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  reward: number;
  condition: AchievementCondition;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_adventure', name: 'Primeira Aventura', icon: '🎒', description: 'Concluir a primeira fase.', reward: 20, condition: { type: 'levelsCompleted', count: 1 } },
  { id: 'divertis_100', name: '100 Divertis', icon: '🪙', description: 'Ganhar 100 Divertis no total.', reward: 15, condition: { type: 'totalEarned', amount: 100 } },
  { id: 'secret_hunter', name: 'Caçador de Segredos', icon: '🔍', description: 'Descobrir 3 segredos.', reward: 40, condition: { type: 'secretsFound', count: 3 } },
  { id: 'levels_10', name: '10 Fases', icon: '🗺️', description: 'Concluir 10 fases.', reward: 100, condition: { type: 'levelsCompleted', count: 10 } },
  { id: 'stars_30', name: '30 Estrelas', icon: '⭐', description: 'Juntar 30 estrelas.', reward: 120, condition: { type: 'totalStars', count: 30 } },
  { id: 'trampoline_master', name: 'Mestre do Trampolim', icon: '🤸', description: 'Dar 25 pulos em trampolins.', reward: 30, condition: { type: 'stat', key: 'trampolineBounces', value: 25 } },
  { id: 'explorer', name: 'Explorador Divertiland', icon: '🧭', description: 'Pegar todos os Divertis de uma fase.', reward: 40, condition: { type: 'stat', key: 'perfectCoinLevels', value: 1 } },
  { id: 'stylish', name: 'Estilo Próprio', icon: '😎', description: 'Comprar o primeiro item na loja.', reward: 10, condition: { type: 'stat', key: 'itemsPurchased', value: 1 } },
];

export function getAchievement(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
