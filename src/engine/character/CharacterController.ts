import { clamp, dampAngle } from '../../core/util';
import type { DifficultyParams } from '../../data/difficulty';
import { MOVEMENT } from '../../data/physicsConfig';
import { CharacterBody } from '../physics/CharacterBody';
import type { PhysicsWorld, V3 } from '../physics/PhysicsWorld';
import type { LocomotionState } from './AnimationController';

export interface MoveIntent {
  /** Direção desejada no MUNDO (x, z), magnitude 0..1. */
  x: number;
  z: number;
  sprint: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
}

export interface ClimbZone {
  /** Normal da rede (para onde ela "olha"). O personagem sobe empurrando contra ela. */
  normal: { x: number; z: number };
  topY: number;
}

export interface ControllerEvents {
  onJump?: () => void;
  onLand?: (impact: number) => void;
  onBounce?: (count: number, power: number) => void;
  onClimbStep?: () => void;
  onClimbTop?: () => void;
}

/**
 * Movimento do personagem 3D (PlayerController/CharacterController da seção 33).
 * Pulo com tolerância (coyote time) e buffer: o jogo "perdoa" pequenos atrasos da criança.
 */
export class CharacterController {
  readonly body: CharacterBody;
  /** Direção para onde o personagem olha (rad, 0 = +Z). */
  yaw = 0;
  events: ControllerEvents = {};
  /** Zona de escalada atual (definida pelo nível a cada quadro). */
  climbZone: ClimbZone | null = null;
  /** Multiplicador temporário (ex.: piscina de bolinhas). */
  speedMul = 1;
  frozen = false;

  private coyote = 0;
  private jumpBuffer = 0;
  private jumping = false;
  private bounceCount = 0;
  /** Quantos quiques seguidos no trampolim (para testes e conquistas). */
  get bounces() {
    return this.bounceCount;
  }
  /** Tempo em que o controle fica reduzido após um empurrão. */
  private stun = 0;
  private climbing = false;
  private climbSoundT = 0;
  private sliding = false;
  private bounceGrace = 0;

  constructor(world: PhysicsWorld, private params: DifficultyParams) {
    this.body = new CharacterBody(world);
  }

  get position(): V3 {
    return this.body.pos;
  }

  get isClimbing() {
    return this.climbing;
  }

  setParams(p: DifficultyParams) {
    this.params = p;
  }

  teleport(p: V3, yaw?: number) {
    this.body.teleport(p);
    if (yaw !== undefined) this.yaw = yaw;
    this.stun = 0;
    this.bounceCount = 0;
    this.climbing = false;
    this.jumping = false;
  }

  /** Empurrão suave de obstáculos (nada de dano: só um "boing"). */
  knockback(dirX: number, dirZ: number, strength: number, up = 4) {
    const k = strength * this.params.knockbackMul;
    const len = Math.hypot(dirX, dirZ) || 1;
    this.body.vel.x = (dirX / len) * k;
    this.body.vel.z = (dirZ / len) * k;
    this.stun = 0.35;
    this.body.vel.y = Math.max(this.body.vel.y, up);
    this.climbing = false;
  }

  /** Lança para cima (trampolins especiais, molas, etc.). */
  launch(vy: number) {
    this.body.vel.y = vy;
    this.jumping = false;
    this.coyote = 0;
  }

  update(dt: number, intent: MoveIntent): void {
    const b = this.body;
    if (this.frozen) {
      intent = { x: 0, z: 0, sprint: false, jumpPressed: false, jumpHeld: false };
    }
    if (intent.jumpPressed) this.jumpBuffer = MOVEMENT.jumpBufferTime;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.bounceGrace = Math.max(0, this.bounceGrace - dt);

    const mag = Math.min(1, Math.hypot(intent.x, intent.z));
    const surface = b.grounded ? b.ground?.surface ?? 'normal' : 'none';

    // ---------------- Escalada (redes) ----------------
    const cz = this.climbZone;
    if (cz) {
      const push = -(intent.x * cz.normal.x + intent.z * cz.normal.z);
      if (!this.climbing && push > 0.35 && b.pos.y < cz.topY - 0.2) this.climbing = true;
      if (this.climbing) {
        if (intent.jumpPressed || push < -0.3) {
          // Solta da rede pulando para trás.
          this.climbing = false;
          b.vel.x = cz.normal.x * 4;
          b.vel.z = cz.normal.z * 4;
          b.vel.y = MOVEMENT.jumpVelocity * 0.6;
          this.jumpBuffer = 0;
        } else {
          const up = Math.max(0, push) * MOVEMENT.climbSpeed * Math.max(0.8, this.params.playerSpeedMul);
          b.vel.y = up;
          // Desliza lateralmente na rede.
          const side = { x: -cz.normal.z, z: cz.normal.x };
          const lat = intent.x * side.x + intent.z * side.z;
          b.vel.x = side.x * lat * 2 - cz.normal.x * 1.5;
          b.vel.z = side.z * lat * 2 - cz.normal.z * 1.5;
          this.yaw = Math.atan2(-cz.normal.x, -cz.normal.z);
          this.climbSoundT -= dt * Math.max(0.3, push);
          if (up > 0.1 && this.climbSoundT <= 0) {
            this.climbSoundT = 0.28;
            this.events.onClimbStep?.();
          }
          if (b.pos.y >= cz.topY - 0.05) {
            // Chegou no topo: pulinho para cima e para dentro da plataforma.
            this.climbing = false;
            b.vel.y = MOVEMENT.climbTopHop;
            b.vel.x = -cz.normal.x * 3.5;
            b.vel.z = -cz.normal.z * 3.5;
            this.events.onClimbTop?.();
          }
          b.step(dt);
          return;
        }
      }
    } else {
      this.climbing = false;
    }

    // ---------------- Horizontal ----------------
    let maxSpeed = (intent.sprint ? MOVEMENT.sprintSpeed : MOVEMENT.walkSpeed) * this.params.playerSpeedMul * this.speedMul;
    if (surface === 'sticky') maxSpeed *= MOVEMENT.stickyMul;
    const targetX = intent.x * maxSpeed;
    const targetZ = intent.z * maxSpeed;

    this.sliding = b.grounded && surface === 'slide';
    if (this.sliding && b.ground?.ramp) {
      // Escorregador: acelera para baixo da rampa, com um pouco de controle lateral.
      const r = b.ground.ramp;
      const down = Math.sign(r.h0 - r.h1); // +1 se desce no sentido positivo do eixo
      const a = MOVEMENT.slideAccel * dt;
      if (r.axis === 'x') {
        b.vel.x = clamp(b.vel.x + down * a, -MOVEMENT.slideMaxSpeed, MOVEMENT.slideMaxSpeed);
        b.vel.z += (targetZ * 0.5 - b.vel.z) * Math.min(1, 6 * dt);
      } else {
        b.vel.z = clamp(b.vel.z + down * a, -MOVEMENT.slideMaxSpeed, MOVEMENT.slideMaxSpeed);
        b.vel.x += (targetX * 0.5 - b.vel.x) * Math.min(1, 6 * dt);
      }
    } else {
      let accel = b.grounded ? (mag > 0.05 ? MOVEMENT.groundAccel : MOVEMENT.groundDecel) : MOVEMENT.airAccel;
      if (this.stun > 0) accel *= 0.12;
      b.vel.x = approach(b.vel.x, targetX, accel * dt);
      b.vel.z = approach(b.vel.z, targetZ, accel * dt);
    }

    this.stun = Math.max(0, this.stun - dt);

    // ---------------- Vertical ----------------
    if (b.grounded) {
      this.coyote = this.params.coyoteTime;
      this.jumping = false;
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
    }

    if (this.jumpBuffer > 0 && (b.grounded || this.coyote > 0) && surface !== 'trampoline') {
      b.vel.y = MOVEMENT.jumpVelocity;
      this.jumping = true;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.bounceCount = 0;
      this.events.onJump?.();
    }
    if (this.jumping && !intent.jumpHeld && b.vel.y > 0) {
      b.vel.y *= MOVEMENT.jumpCutMultiplier;
      this.jumping = false;
    }
    b.vel.y = Math.max(-MOVEMENT.maxFallSpeed, b.vel.y - MOVEMENT.gravity * dt);

    b.step(dt);

    if (b.carriedYaw) this.yaw += b.carriedYaw;

    // ---------------- Pouso / trampolim ----------------
    if (b.landedThisFrame) {
      const g = b.ground;
      if (g?.surface === 'trampoline') {
        this.bounce(intent.jumpHeld || this.jumpBuffer > 0);
      } else {
        if (this.bounceGrace <= 0) this.bounceCount = 0;
        this.events.onLand?.(-b.landingSpeed);
      }
    } else if (b.grounded && b.ground?.surface === 'trampoline') {
      this.bounce(intent.jumpHeld);
    }

    // ---------------- Direção do rosto ----------------
    const hs = Math.hypot(b.vel.x, b.vel.z);
    if (mag > 0.1 && hs > 0.3) {
      this.yaw = dampAngle(this.yaw, Math.atan2(intent.x, intent.z), MOVEMENT.turnSpeed, dt);
    }
  }

  private bounce(timed: boolean) {
    const b = this.body;
    this.bounceCount = Math.min(this.bounceCount + 1, 20);
    let power = MOVEMENT.trampolineBase + MOVEMENT.trampolineStep * (this.bounceCount - 1);
    if (timed) power += MOVEMENT.trampolineTimingBonus;
    const mul = (b.ground?.data?.power as number | undefined) ?? 1;
    power = Math.min(MOVEMENT.trampolineMax, power) * mul;
    b.vel.y = power;
    b.grounded = false;
    this.jumping = false;
    this.bounceGrace = 0.6;
    this.events.onBounce?.(this.bounceCount, power);
  }

  locomotion(): { state: LocomotionState; speed01: number } {
    const b = this.body;
    const hs = Math.hypot(b.vel.x, b.vel.z);
    if (this.climbing) return { state: 'climb', speed01: Math.min(1, Math.abs(b.vel.y) / MOVEMENT.climbSpeed) };
    if (this.sliding) return { state: 'slide', speed01: 1 };
    if (!b.grounded) return { state: b.vel.y > 0 ? 'jump' : 'fall', speed01: 0 };
    if (hs < 0.4) return { state: 'idle', speed01: 0 };
    const run = hs > MOVEMENT.walkSpeed * 1.05;
    return { state: run ? 'run' : 'walk', speed01: Math.min(1, hs / MOVEMENT.walkSpeed) };
  }
}

function approach(v: number, target: number, maxDelta: number) {
  if (v < target) return Math.min(target, v + maxDelta);
  return Math.max(target, v - maxDelta);
}
