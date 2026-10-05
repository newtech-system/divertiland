import * as THREE from 'three';
import { ECONOMY } from '../../data/economy';
import type { V3 } from '../../engine/physics/PhysicsWorld';
import type { BuiltLevel, CoinInfo } from './LevelBuilder';

export interface PickupEvent {
  type: 'coin' | 'gem' | 'collectible';
  id: string;
  pos: THREE.Vector3;
}

/**
 * Moedas (Divertis), gemas e colecionáveis (seção 22). Usa InstancedMesh: centenas de
 * moedas giram com 1 draw call. Ímã de moedas mais forte no Bicho-Preguiça.
 */
export class CollectibleSystem {
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private attracted = new Set<CoinInfo>();
  divertis = 0;
  collectedCount = 0;
  collectiblesFound: string[] = [];

  constructor(
    private lvl: BuiltLevel,
    private magnetRadius: number,
  ) {}

  get total() {
    return this.lvl.coins.length;
  }

  /** Restaura moedas já pegas (ao continuar uma partida salva). */
  restore(collectedIds: string[], collectibles: string[]) {
    const set = new Set(collectedIds);
    for (const c of this.lvl.coins) {
      if (set.has(c.id)) {
        c.taken = true;
        this.collectedCount++;
        this.divertis += c.kind === 'gem' ? ECONOMY.gemValue : ECONOMY.coinValue;
      }
    }
    for (const col of this.lvl.collectibles) {
      if (collectibles.includes(col.id)) {
        col.taken = true;
        col.obj.visible = false;
        this.collectiblesFound.push(col.id);
      }
    }
  }

  takenIds(): string[] {
    return this.lvl.coins.filter((c) => c.taken).map((c) => c.id);
  }

  update(t: number, dt: number, player: V3, out: PickupEvent[]) {
    out.length = 0;
    const center = new THREE.Vector3(player.x, player.y + 0.75, player.z);
    const { coin, gem } = this.lvl.coinMeshes;
    this.q.setFromAxisAngle(this.up, t * 3);
    for (const c of this.lvl.coins) {
      const mesh = c.kind === 'coin' ? coin : gem;
      if (!mesh) continue;
      if (c.taken || c.hidden) {
        this.m.makeScale(0, 0, 0);
        mesh.setMatrixAt(c.index, this.m);
        continue;
      }
      const d = c.pos.distanceTo(center);
      if (d < this.magnetRadius + 0.5 || this.attracted.has(c)) {
        this.attracted.add(c);
        c.pos.lerp(center, Math.min(1, dt * 12));
      }
      if (c.pos.distanceTo(center) < 0.85) {
        c.taken = true;
        this.attracted.delete(c);
        this.collectedCount++;
        this.divertis += c.kind === 'gem' ? ECONOMY.gemValue : ECONOMY.coinValue;
        out.push({ type: c.kind, id: c.id, pos: c.pos.clone() });
        this.m.makeScale(0, 0, 0);
      } else {
        const bob = Math.sin(t * 3 + c.index) * 0.08;
        this.s.setScalar(1);
        this.m.compose(new THREE.Vector3(c.pos.x, c.pos.y + bob, c.pos.z), this.q, this.s);
      }
      mesh.setMatrixAt(c.index, this.m);
    }
    if (coin) coin.instanceMatrix.needsUpdate = true;
    if (gem) gem.instanceMatrix.needsUpdate = true;

    for (const col of this.lvl.collectibles) {
      if (col.taken) continue;
      if (col.obj.position.distanceTo(center) < 1.1) {
        col.taken = true;
        col.obj.visible = false;
        this.collectiblesFound.push(col.id);
        out.push({ type: 'collectible', id: col.id, pos: col.obj.position.clone() });
      }
    }
  }

  collectAll(out: PickupEvent[]) {
    for (const c of this.lvl.coins) if (!c.taken) c.pos.set(1e6, 1e6, 1e6), this.attracted.add(c);
    out.length = 0;
    for (const c of this.lvl.coins) {
      if (c.taken) continue;
      c.taken = true;
      this.collectedCount++;
      this.divertis += c.kind === 'gem' ? ECONOMY.gemValue : ECONOMY.coinValue;
    }
    for (const col of this.lvl.collectibles) {
      if (!col.taken) {
        col.taken = true;
        col.obj.visible = false;
        this.collectiblesFound.push(col.id);
      }
    }
  }
}
