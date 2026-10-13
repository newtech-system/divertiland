/**
 * ENVELOPE DE MOVIMENTO MEDIDO (seção 7.1).
 *
 * Estes números NÃO foram inventados: saíram da área de teste
 * (engine/physics/reachProbe.ts) simulando a física de verdade, e são conferidos pelo
 * teste automático tests/reach.test.ts. Se alguém mexer na gravidade, na força do pulo
 * ou na velocidade, o teste quebra e obriga a atualizar este arquivo — nunca o contrário.
 *
 * Todo percurso das fases é validado contra estes limites (layoutAudit.ts), com margem
 * de segurança por estilo de aventura: o Bicho-Preguiça nunca depende de um pulo apertado.
 */
export const REACH = {
  /** Altura que os pés alcançam num pulo (m). */
  jumpHeight: 1.77,
  /** Plataforma mais alta em que ainda dá para subir pulando (pulo + degrau automático). */
  stepUpHeight: 2.19,
  /** Vão horizontal que o pulo cruza ANDANDO (sem correr) — é este o limite de projeto. */
  jumpDistanceWalk: 4.05,
  /** Vão horizontal correndo (só vale como folga, nunca como exigência). */
  jumpDistanceRun: 6.15,
  /** Tempo no ar de um pulo completo (s) — usado para ritmar plataformas móveis. */
  airtime: 0.73,
  /** Degrau que sobe sozinho, sem pular. */
  autoStep: 0.42,
  /** Altura de cada quique seguido no trampolim (1º, 2º, 3º, 4º; depois estabiliza). */
  trampoline: [4.49, 6.15, 8.07, 9.97],
  /** Alcance de coleta: moeda a 0,85 m e colecionável a 1,1 m do peito (pés + 0,75). */
  pickup: { chest: 0.75, coin: 0.85, collectible: 1.1 },
} as const;

/**
 * Margem de segurança exigida em cada estilo (m). O percurso obrigatório tem de caber
 * com folga; pulos "no limite" só podem existir em caminhos opcionais do Jaguar.
 */
export const REACH_MARGIN: Record<'sloth' | 'monkey' | 'jaguar', number> = {
  sloth: 0.8,
  monkey: 0.5,
  jaguar: 0.35,
};
