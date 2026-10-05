import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/util';
import type { PhysicsWorld, V3 } from './physics/PhysicsWorld';

/**
 * Câmera em terceira pessoa (seção 9):
 * - acompanha suavemente;
 * - não atravessa paredes (raio contra colisores, aproxima quando necessário);
 * - volta para trás do personagem sozinha quando a criança só anda (menos esforço);
 * - movimentos amortecidos para não causar enjoo.
 */
export class CameraController {
  yaw = Math.PI; // câmera atrás do personagem que olha para +Z
  pitch = 0.32;
  distance = 6;
  minDistance = 1.1;
  maxDistance = 9;
  targetHeight = 1.35;
  autoFollow = true;
  private curDist = 6;
  private target = new THREE.Vector3();
  private lastManual = -10;
  private time = 0;
  private initialized = false;
  /** Pitch e distância preferidos podem ser sobrescritos por zonas de câmera do nível. */
  zonePitch: number | null = null;
  zoneDistance: number | null = null;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private world: PhysicsWorld | null,
  ) {}

  snapBehind(yaw: number) {
    this.yaw = yaw + Math.PI;
    this.initialized = false;
  }

  update(dt: number, focus: V3, look: { x: number; y: number; zoom: number }, moving: { x: number; z: number; speed: number }) {
    this.time += dt;
    const manual = Math.abs(look.x) + Math.abs(look.y) > 0.01;
    if (manual) this.lastManual = this.time;
    this.yaw -= look.x * 0.0055;
    this.pitch = clamp(this.pitch + look.y * 0.004, -0.15, 1.1);
    if (look.zoom) this.distance = clamp(this.distance + look.zoom * 0.6, 3, this.maxDistance);

    // Seguir automaticamente por trás quando a criança está andando (sem mexer na câmera).
    if (this.autoFollow && this.time - this.lastManual > 1.4 && moving.speed > 1) {
      const heading = Math.atan2(moving.x, moving.z);
      const behind = heading + Math.PI;
      // Só gira se o personagem não estiver vindo na direção da câmera (evita giros bruscos).
      const camForward = this.yaw + Math.PI;
      const diff = Math.abs(((heading - camForward + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff < 2.2) this.yaw = dampAngle(this.yaw, behind, 1.2, dt);
    }
    if (this.zonePitch !== null && this.time - this.lastManual > 1.4) this.pitch = damp(this.pitch, this.zonePitch, 2, dt);

    const desiredTarget = new THREE.Vector3(focus.x, focus.y + this.targetHeight, focus.z);
    if (!this.initialized) {
      this.target.copy(desiredTarget);
      this.curDist = this.distance;
      this.initialized = true;
    } else {
      this.target.x = damp(this.target.x, desiredTarget.x, 14, dt);
      this.target.z = damp(this.target.z, desiredTarget.z, 14, dt);
      // Vertical mais suave: pulos não chacoalham a câmera.
      this.target.y = damp(this.target.y, desiredTarget.y, 6, dt);
    }

    const wanted = this.zoneDistance ?? this.distance;
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    let allowed = wanted;
    if (this.world) {
      const hit = this.world.raycast(this.target, dir, wanted + 0.3, (c) => c.blocksCamera);
      if (hit !== null) allowed = Math.max(this.minDistance, hit - 0.35);
    }
    // Aproxima rápido (evita ver através da parede), afasta devagar.
    this.curDist = allowed < this.curDist ? allowed : damp(this.curDist, allowed, 3, dt);

    this.camera.position.copy(this.target).addScaledVector(dir, this.curDist);
    this.camera.lookAt(this.target);
  }

  /** Vetores frente/direita no plano (para converter o joystick em direção no mundo). */
  planarBasis(): { fx: number; fz: number; rx: number; rz: number } {
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    return { fx, fz, rx: -fz, rz: fx };
  }
}
