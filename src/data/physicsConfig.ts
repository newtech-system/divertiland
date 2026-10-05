/**
 * Ajustes de "sensação" do movimento 3D. Centralizados para facilitar o balanceamento.
 * A dificuldade multiplica velocidade e tolerâncias (data/difficulty.ts).
 */
export const MOVEMENT = {
  gravity: 26,
  maxFallSpeed: 28,
  walkSpeed: 5.4,
  sprintSpeed: 8.2,
  groundAccel: 45,
  groundDecel: 38,
  /** Controle no ar generoso: crianças corrigem o pulo no meio do caminho. */
  airAccel: 24,
  turnSpeed: 14,
  jumpVelocity: 9.8,
  /** Soltar o botão cedo corta o pulo (pulo curto/longo). */
  jumpCutMultiplier: 0.5,
  jumpBufferTime: 0.15,
  climbSpeed: 3.4,
  climbTopHop: 6.5,
  slideAccel: 14,
  slideMaxSpeed: 13,
  /** Trampolim: altura cresce a cada pulo seguido, com limite (seção 18). */
  trampolineBase: 13,
  trampolineStep: 2.6,
  trampolineMax: 23,
  /** Apertar pular no momento do toque dá um impulso extra. */
  trampolineTimingBonus: 2.5,
  stickyMul: 0.55,
} as const;
