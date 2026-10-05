import { PhysicsWorld, type Collider, type V3 } from './PhysicsWorld';

const EPS = 0.001;
const MAX_SUBSTEP = 0.18;

/**
 * Corpo cinemático do personagem (posição = pés). Só cuida de COLISÃO — a lógica de
 * andar/pular fica no CharacterController, e a aparência no CharacterModel/Animator
 * (seção 52: separar movimento lógico de representação visual).
 */
export class CharacterBody {
  pos: V3 = { x: 0, y: 0, z: 0 };
  vel: V3 = { x: 0, y: 0, z: 0 };
  radius = 0.34;
  height = 1.45;
  stepHeight = 0.42;
  grounded = false;
  wasGrounded = false;
  ground: Collider | null = null;
  /** Velocidade vertical no momento do pouso (negativa). */
  landingSpeed = 0;
  landedThisFrame = false;
  hitHead = false;
  hitWall = false;
  /** Rotação aplicada por plataforma giratória neste quadro (para girar o personagem junto). */
  carriedYaw = 0;

  private tmp: Collider[] = [];

  constructor(private world: PhysicsWorld) {}

  teleport(p: V3): void {
    this.pos = { ...p };
    this.vel = { x: 0, y: 0, z: 0 };
    this.grounded = false;
    this.ground = null;
  }

  private boxAt(): [V3, V3] {
    const { x, y, z } = this.pos;
    const r = this.radius;
    return [
      { x: x - r + EPS, y: y + EPS, z: z - r + EPS },
      { x: x + r - EPS, y: y + this.height - EPS, z: z + r - EPS },
    ];
  }

  step(dt: number): void {
    this.wasGrounded = this.grounded;
    this.landedThisFrame = false;
    this.hitHead = false;
    this.hitWall = false;
    this.carriedYaw = 0;

    // 1) Ser carregado pela plataforma onde está em pé.
    const g = this.wasGrounded ? this.ground : null;
    if (g && g.enabled) {
      this.pos.x += g.velocity.x * dt;
      this.pos.y += Math.max(0, g.velocity.y) * dt;
      this.pos.z += g.velocity.z * dt;
      if (g.angularVelocity) {
        const cx = (g.min.x + g.max.x) / 2;
        const cz = (g.min.z + g.max.z) / 2;
        const a = g.angularVelocity * dt;
        const dx = this.pos.x - cx;
        const dz = this.pos.z - cz;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        this.pos.x = cx + dx * cos + dz * sin;
        this.pos.z = cz - dx * sin + dz * cos;
        this.carriedYaw = a;
      }
    }

    // 2) Sair de dentro de objetos que se moveram para cima do personagem.
    this.depenetrate();

    // 3) Movimento por eixos com sub-passos (evita atravessar paredes finas).
    this.grounded = false;
    this.ground = null;
    const dx = this.vel.x * dt;
    const dy = this.vel.y * dt;
    const dz = this.vel.z * dt;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / MAX_SUBSTEP));
    for (let i = 0; i < n; i++) {
      this.moveHorizontal('x', dx / n);
      this.moveHorizontal('z', dz / n);
      this.moveVertical(dy / n);
    }

    // 4) Grudar no chão ao descer rampas/degraus pequenos (sem "quicar").
    if (!this.grounded && this.wasGrounded && this.vel.y <= 0) {
      const hit = this.world.groundBelow(this.pos.x, this.pos.y, this.pos.z, this.stepHeight * 0.9, this.radius * 0.7);
      if (hit && hit.collider.surface !== 'trampoline') {
        this.pos.y = hit.y;
        this.setGrounded(hit.collider, this.vel.y);
      }
    }
    if (this.grounded && !this.wasGrounded) this.landedThisFrame = true;
  }

  private setGrounded(c: Collider, impactVy: number) {
    if (!this.wasGrounded && !this.grounded) this.landingSpeed = impactVy;
    this.grounded = true;
    this.ground = c;
    if (this.vel.y < 0) this.vel.y = 0;
  }

  private moveHorizontal(axis: 'x' | 'z', delta: number) {
    if (delta === 0) return;
    this.pos[axis] += delta;
    const [min, max] = this.boxAt();
    for (const c of this.world.overlapping(min, max, this.tmp)) {
      if (c.oneWay) continue;
      if (c.shape === 'ramp') {
        const top = PhysicsWorld.rampTopClamped(c, this.pos.x, this.pos.z);
        if (this.pos.y >= top - this.stepHeight) {
          if (this.pos.y < top) this.pos.y = top;
          continue;
        }
      } else {
        // Degrau baixo: sobe automaticamente (mais amigável que exigir pulo).
        const top = c.max.y;
        if (top - this.pos.y <= this.stepHeight && this.vel.y <= 0.5 && this.spaceAbove(top)) {
          this.pos.y = top;
          continue;
        }
      }
      if (c.shape === 'cylinder') {
        this.pushOutCylinder(c);
        continue;
      }
      const r = this.radius;
      if (delta > 0) this.pos[axis] = Math.min(this.pos[axis], c.min[axis] - r);
      else this.pos[axis] = Math.max(this.pos[axis], c.max[axis] + r);
      this.vel[axis] = 0;
      this.hitWall = true;
    }
  }

  private pushOutCylinder(c: Collider) {
    const cx = (c.min.x + c.max.x) / 2;
    const cz = (c.min.z + c.max.z) / 2;
    const R = (c.radius ?? (c.max.x - c.min.x) / 2) + this.radius;
    let ox = this.pos.x - cx;
    let oz = this.pos.z - cz;
    const d = Math.hypot(ox, oz);
    if (d >= R) return;
    if (d < 1e-4) {
      ox = 1;
      oz = 0;
    } else {
      ox /= d;
      oz /= d;
    }
    this.pos.x = cx + ox * R;
    this.pos.z = cz + oz * R;
    this.hitWall = true;
  }

  private spaceAbove(top: number): boolean {
    const r = this.radius;
    const min = { x: this.pos.x - r + EPS, y: top + EPS, z: this.pos.z - r + EPS };
    const max = { x: this.pos.x + r - EPS, y: top + this.height, z: this.pos.z + r - EPS };
    return this.world.overlapping(min, max, []).every((c) => c.oneWay);
  }

  private moveVertical(delta: number) {
    const prevY = this.pos.y;
    this.pos.y += delta;
    const [min, max] = this.boxAt();
    for (const c of this.world.overlapping(min, max, this.tmp)) {
      if (c.shape === 'ramp') {
        const top = PhysicsWorld.rampTopClamped(c, this.pos.x, this.pos.z);
        if (this.pos.y < top && delta <= 0 && prevY >= top - this.stepHeight - 0.05) {
          this.pos.y = top;
          this.setGrounded(c, this.vel.y);
        }
        continue;
      }
      if (c.shape === 'cylinder') {
        const top = PhysicsWorld.topAt(c, this.pos.x, this.pos.z);
        if (top === null) {
          continue; // o canto do personagem pega o AABB mas não o cilindro
        }
      }
      if (c.oneWay) {
        if (delta < 0 && prevY >= c.max.y - 0.06) {
          this.pos.y = c.max.y;
          this.setGrounded(c, this.vel.y);
        }
        continue;
      }
      if (delta < 0) {
        this.pos.y = c.max.y;
        this.setGrounded(c, this.vel.y);
      } else if (delta > 0) {
        this.pos.y = c.min.y - this.height;
        if (this.vel.y > 0) this.vel.y = 0;
        this.hitHead = true;
      }
    }
  }

  private depenetrate() {
    const [min, max] = this.boxAt();
    for (const c of this.world.overlapping(min, max, this.tmp)) {
      if (c.oneWay || c.shape === 'ramp') continue;
      if (c.shape === 'cylinder') {
        if (PhysicsWorld.topAt(c, this.pos.x, this.pos.z) === null) continue;
        const up = c.max.y - this.pos.y;
        if (up <= this.stepHeight) this.pos.y = c.max.y;
        else this.pushOutCylinder(c);
        continue;
      }
      const r = this.radius;
      const pen = [
        { a: 'y' as const, d: c.max.y - this.pos.y, v: c.max.y },
        { a: 'x' as const, d: this.pos.x + r - c.min.x, v: c.min.x - r },
        { a: 'x' as const, d: c.max.x - (this.pos.x - r), v: c.max.x + r },
        { a: 'z' as const, d: this.pos.z + r - c.min.z, v: c.min.z - r },
        { a: 'z' as const, d: c.max.z - (this.pos.z - r), v: c.max.z + r },
      ];
      // Preferência para subir em cima (resolver pela menor penetração, com bônus para Y).
      pen[0].d *= 0.6;
      pen.sort((p, q) => p.d - q.d);
      const best = pen[0];
      if (best.d > 0) this.pos[best.a] = best.v;
    }
  }
}
