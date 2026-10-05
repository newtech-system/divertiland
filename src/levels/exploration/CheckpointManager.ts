import * as THREE from 'three';
import type { V3 } from '../../engine/physics/PhysicsWorld';
import type { CheckpointInfo } from './LevelBuilder';

/**
 * Checkpoints (seção 28): voltar rápido, sem telas demoradas.
 * Só avança (encostar num checkpoint antigo não "puxa" o progresso para trás).
 */
export class CheckpointManager {
  private current: CheckpointInfo | null = null;

  constructor(
    private list: CheckpointInfo[],
    private spawn: { pos: V3; yaw: number },
  ) {}

  get currentId(): string | null {
    return this.current?.id ?? null;
  }

  /** Retorna true se este checkpoint virou o atual agora. */
  activate(id: string): boolean {
    const cp = this.list.find((c) => c.id === id);
    if (!cp) return false;
    if (this.current && cp.order <= this.current.order) return false;
    for (const c of this.list) {
      if (c.order <= cp.order && !c.active) {
        c.active = true;
        (c.flag.material as THREE.MeshToonMaterial).color.set('#39ff88');
        (c.flag.material as THREE.MeshToonMaterial).emissive = new THREE.Color('#1a8a4a');
      }
    }
    this.current = cp;
    return true;
  }

  respawnPoint(): { pos: V3; yaw: number } {
    if (!this.current) return this.spawn;
    return { pos: { x: this.current.pos.x, y: this.current.pos.y + 0.1, z: this.current.pos.z + 0.8 }, yaw: this.current.yaw };
  }

  ids(): string[] {
    return this.list.map((c) => c.id);
  }

  get(id: string) {
    return this.list.find((c) => c.id === id);
  }
}
