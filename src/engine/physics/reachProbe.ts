import { getDifficultyParams, type DifficultyParams } from '../../data/difficulty';
import type { DifficultyId } from '../../core/types';
import { MOVEMENT } from '../../data/physicsConfig';
import { CharacterController, type MoveIntent } from '../character/CharacterController';
import { PhysicsWorld, makeBox } from './PhysicsWorld';

/**
 * ÁREA DE TESTE DE MOVIMENTO (seção 7.1 do prompt mestre).
 *
 * Antes de desenhar percurso nenhum, é preciso saber QUANTO o personagem alcança:
 * altura do pulo, distância do pulo andando e correndo, tempo no ar, degrau automático
 * e altura dos trampolins. Estes números são MEDIDOS simulando a física de verdade
 * (não chutados), e servem de limite para validar cada travessia das fases
 * (ver levels/exploration/layoutAudit.ts).
 *
 * Roda em teste (vitest) e no navegador — não depende de three.js nem de tela.
 */

export interface ReachEnvelope {
  /** Altura máxima que os pés alcançam num pulo parado, segurando o botão. */
  jumpHeight: number;
  /** Altura máxima de um degrau/plataforma em que ainda dá para subir pulando. */
  stepUpHeight: number;
  /** Distância horizontal de um pulo ANDANDO (sem correr) saindo do plano. */
  jumpDistanceWalk: number;
  /** Distância horizontal de um pulo CORRENDO. */
  jumpDistanceRun: number;
  /** Tempo no ar de um pulo completo (s). */
  airtime: number;
  /** Degrau que o personagem sobe sozinho, sem pular. */
  autoStep: number;
  /** Altura ganha em cada quique seguido no trampolim (1º, 2º, 3º...). */
  trampolineHeights: number[];
}

const DT = 1 / 60;

function neutral(): MoveIntent {
  return { x: 0, z: 0, sprint: false, jumpPressed: false, jumpHeld: false };
}

function flatWorld(): PhysicsWorld {
  const w = new PhysicsWorld();
  w.add(makeBox({ x: -200, y: -2, z: -400 }, { x: 200, y: 0, z: 400 }));
  return w;
}

/** Pulo parado: devolve a altura máxima dos pés. */
function measureJumpHeight(params: DifficultyParams): { height: number; airtime: number } {
  const c = new CharacterController(flatWorld(), params);
  c.teleport({ x: 0, y: 0, z: 0 });
  c.update(DT, neutral()); // assenta no chão
  let top = 0;
  let airtime = 0;
  let launched = false;
  for (let i = 0; i < 240; i++) {
    const intent: MoveIntent = { ...neutral(), jumpPressed: i === 0, jumpHeld: true };
    c.update(DT, intent);
    if (!c.body.grounded) {
      launched = true;
      airtime += DT;
    } else if (launched) break;
    top = Math.max(top, c.position.y);
  }
  return { height: top, airtime };
}

/** Pulo em movimento: acelera até a velocidade máxima, pula e mede o avanço até pousar. */
function measureJumpDistance(params: DifficultyParams, sprint: boolean): number {
  const c = new CharacterController(flatWorld(), params);
  c.teleport({ x: 0, y: 0, z: 0 });
  const run: MoveIntent = { x: 0, z: 1, sprint, jumpPressed: false, jumpHeld: false };
  for (let i = 0; i < 120; i++) c.update(DT, run); // já na velocidade máxima
  const z0 = c.position.z;
  c.update(DT, { ...run, jumpPressed: true, jumpHeld: true });
  let launched = false;
  for (let i = 0; i < 240; i++) {
    c.update(DT, { ...run, jumpHeld: true });
    if (!c.body.grounded) launched = true;
    else if (launched) break;
  }
  return c.position.z - z0;
}

/** Maior plataforma em que ainda dá para subir pulando (busca binária). */
function measureStepUp(params: DifficultyParams, maxTry: number): number {
  const can = (h: number) => {
    const w = flatWorld();
    w.add(makeBox({ x: -3, y: 0, z: 1 }, { x: 3, y: h, z: 9 }));
    const c = new CharacterController(w, params);
    c.teleport({ x: 0, y: 0, z: -0.6 });
    const walk: MoveIntent = { x: 0, z: 1, sprint: false, jumpPressed: false, jumpHeld: false };
    c.update(DT, walk);
    c.update(DT, { ...walk, jumpPressed: true, jumpHeld: true });
    for (let i = 0; i < 180; i++) {
      c.update(DT, { ...walk, jumpHeld: true });
      if (c.body.grounded && c.position.y >= h - 0.02) return true;
    }
    return false;
  };
  let lo = 0;
  let hi = maxTry;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (can(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Alturas alcançadas em quiques seguidos no trampolim. */
function measureTrampoline(params: DifficultyParams, bounces = 5): number[] {
  const w = flatWorld();
  w.add(makeBox({ x: -3, y: -0.4, z: -3 }, { x: 3, y: 0, z: 3 }, { surface: 'trampoline' }));
  const c = new CharacterController(w, params);
  c.teleport({ x: 0, y: 0.1, z: 0 });
  const out: number[] = [];
  let prevVy = 0;
  for (let i = 0; i < 2400 && out.length < bounces; i++) {
    c.update(DT, { ...neutral(), jumpHeld: true });
    // Apogeu de cada quique: a velocidade vertical passa de subindo para descendo.
    if (prevVy > 0 && c.body.vel.y <= 0) out.push(+c.position.y.toFixed(2));
    prevVy = c.body.vel.y;
  }
  return out;
}

export function measureReach(id: DifficultyId): ReachEnvelope {
  const params = getDifficultyParams(id);
  const { height, airtime } = measureJumpHeight(params);
  return {
    jumpHeight: +height.toFixed(2),
    stepUpHeight: +measureStepUp(params, height + 0.5).toFixed(2),
    jumpDistanceWalk: +measureJumpDistance(params, false).toFixed(2),
    jumpDistanceRun: +measureJumpDistance(params, true).toFixed(2),
    airtime: +airtime.toFixed(2),
    autoStep: MOVEMENT.jumpVelocity > 0 ? 0.42 : 0.42,
    trampolineHeights: measureTrampoline(params),
  };
}

export function measureAllStyles(): Record<DifficultyId, ReachEnvelope> {
  return {
    sloth: measureReach('sloth'),
    monkey: measureReach('monkey'),
    jaguar: measureReach('jaguar'),
  };
}
