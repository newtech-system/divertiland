/**
 * ECONOMIA DE DUAS MOEDAS E PRÊMIOS PRESENCIAIS (seção 18 do prompt mestre V2).
 *
 * Duas funções diferentes, dois saldos separados, sem conversão livre entre eles:
 *  - **Divertis**: moeda de brincadeira (roupas, decoração, brinquedos virtuais, mundo).
 *  - **Pontos de Troca Divertiland**: pontos elegíveis para escolher um brinde ou
 *    benefício na Divertiland física.
 *
 * ⚠️ **ESTE MÓDULO ESTÁ EM SIMULAÇÃO.** Nenhum resgate real acontece, nenhum ponto vale
 * prêmio, e os números de pontos abaixo são **fictícios de teste**. Para ligar de verdade
 * faltam decisões da proprietária (orçamento, custos completos, estoque, regras por
 * criança/família) e um servidor como autoridade do saldo (seção 19.1). Trocar
 * `REWARD_MODE` para 'real' sem isso é proibido pelo próprio documento.
 */

export type RewardMode = 'simulacao' | 'real';

/** Enquanto for 'simulacao': catálogo visível só em ferramentas internas, resgate desligado. */
export const REWARD_MODE: RewardMode = 'simulacao';

/** O resgate presencial está disponível? Hoje, nunca. */
export function redemptionEnabled(): boolean {
  return REWARD_MODE === 'real';
}

export interface TokenSource {
  id: string;
  label: string;
  /** Quantos Pontos de Troca emite. FICTÍCIO até a proprietária fechar o orçamento. */
  points: number;
  /** Quantas vezes pode pagar por perfil elegível. */
  limit: 'umaVezPorAventura' | 'umaVezPorColecao' | 'umaVezPorCampanha';
  note: string;
}

/**
 * De onde saem Pontos de Troca: só marcos **verificáveis e únicos** (seção 18.2).
 * Nada de multiplicar por tempo online, cliques, morrer/reiniciar ou repetir a coleção.
 */
export const TOKEN_SOURCES: TokenSource[] = [
  {
    id: 'primeiraConclusao',
    label: 'Primeira vez que conclui uma aventura',
    points: 10,
    limit: 'umaVezPorAventura',
    note: 'Paga uma vez por aventura, independente de estilo, aparelho ou repetição.',
  },
  {
    id: 'colecaoCompleta',
    label: 'Coleção de ursinhos dourados completa (3/3)',
    points: 15,
    limit: 'umaVezPorColecao',
    note: 'Paga uma vez por aventura ao fechar 3/3; recolher o mesmo ursinho não paga.',
  },
  {
    id: 'missaoEspecialAjuda',
    label: 'Missão especial de ajuda concluída',
    points: 5,
    limit: 'umaVezPorAventura',
    note: 'A ajuda extra de cada aventura (a estrela 2), uma vez só.',
  },
];

export interface PrizeTier {
  id: string;
  name: string;
  /** Custo COMPLETO do item para a Divertiland (não é preço de venda). */
  costBRL: { min: number; max: number } | null;
  /** Pontos exigidos. `null` = **a definir pela proprietária** (seção 18.4). */
  points: number | null;
  examples: string[];
  note?: string;
}

/**
 * Faixas do catálogo, conforme a atualização da proprietária (seção 18.3).
 * Os valores em reais são **custo para a Divertiland**. Os pontos ficam em aberto de
 * propósito: o documento proíbe definir isso automaticamente antes do orçamento.
 */
export const PRIZE_TIERS: PrizeTier[] = [
  {
    id: 'pequenas',
    name: 'Pequenas conquistas',
    costBRL: { min: 0, max: 5 },
    points: null,
    examples: ['brinde simples (R$ 2)', 'bolinha de sabão (R$ 3)', 'livro de pintura (R$ 5)'],
  },
  {
    id: 'especiais',
    name: 'Conquistas especiais',
    costBRL: { min: 5.01, max: 10 },
    points: null,
    examples: ['brinquedinhos', 'chaveiros', 'miniaturas', 'kits pequenos'],
  },
  {
    id: 'grandes',
    name: 'Grandes conquistas',
    costBRL: { min: 10.01, max: 15 },
    points: null,
    examples: ['meia (≈ R$ 12)', 'outros brindes de custo compatível'],
  },
  {
    id: 'experiencias',
    name: 'Experiências Divertiland',
    costBRL: null,
    points: null,
    examples: ['meia hora', 'uma hora', 'day-use'],
    note: 'Custo depende de capacidade e horário — precisa de análise de operação.',
  },
  {
    id: 'familia',
    name: 'Benefícios para a família',
    costBRL: null,
    points: null,
    examples: ['descontos no parque', 'desconto de 5% em festas de aniversário'],
    note:
      'O cupom de 5% em festas é um benefício próprio: falta definir base elegível, ' +
      'modalidades, teto e acumulação. 5% de uma base de R$ 2.000 são R$ 100 — por isso ' +
      'ele não entra na faixa de brindes de até R$ 15.',
  },
];

/** Dados que ainda faltam para fechar a tabela real (seção 18.6). */
export const PENDING_REWARD_DATA = [
  'Custo completo de cada doce, chaveiro, copo, meia e miniatura',
  'Impressão 3D: material, perdas, máquina, acabamento e trabalho',
  'Embalagem e consumíveis',
  'Preços e durações dos serviços do parque',
  'Orçamento mensal para recompensas',
  'Quantidade estimada de crianças e frequência de resgates',
  'Frequência de novas missões e campanhas',
  'Estoque e capacidade de reposição',
  'Regras por criança, perfil e família',
] as const;
