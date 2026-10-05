/**
 * Física leve e própria (seção 36: "evitar física desnecessária").
 * O mundo da Divertiland é feito de blocos de espuma, rampas e cilindros — colisores
 * alinhados aos eixos resolvem isso com precisão, custo baixo e comportamento previsível,
 * o que é ótimo para crianças (nada de personagem "travando" em quinas de física complexa).
 */

export type SurfaceType = 'normal' | 'trampoline' | 'slide' | 'lava' | 'sticky';

export interface V3 {
  x: number;
  y: number;
  z: number;
}

export interface Collider {
  id: number;
  shape: 'box' | 'cylinder' | 'ramp';
  min: V3;
  max: V3;
  /** Rampa: eixo de inclinação e alturas no lado mínimo/máximo do eixo. */
  ramp?: { axis: 'x' | 'z'; h0: number; h1: number };
  /** Cilindro vertical: raio (centro = meio do AABB). */
  radius?: number;
  surface: SurfaceType;
  /** Plataforma "de um lado só": dá para subir por baixo e pousar por cima. */
  oneWay?: boolean;
  blocksCamera: boolean;
  enabled: boolean;
  /** Velocidade (m/s) para carregar o personagem em plataformas móveis. */
  velocity: V3;
  /** Rotação em torno do eixo Y (rad/s) — plataformas giratórias. */
  angularVelocity: number;
  tag?: string;
  data?: Record<string, unknown>;
}

let nextId = 1;

export function makeBox(min: V3, max: V3, opts: Partial<Collider> = {}): Collider {
  return {
    id: nextId++,
    shape: 'box',
    min: { ...min },
    max: { ...max },
    surface: 'normal',
    blocksCamera: true,
    enabled: true,
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: 0,
    ...opts,
  };
}

export class PhysicsWorld {
  colliders: Collider[] = [];

  add(c: Collider): Collider {
    this.colliders.push(c);
    return c;
  }

  remove(c: Collider): void {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
  }

  clear(): void {
    this.colliders = [];
  }

  /** Altura da superfície de cima do colisor no ponto (x, z), ou null se o ponto está fora. */
  static topAt(c: Collider, x: number, z: number): number | null {
    if (x < c.min.x || x > c.max.x || z < c.min.z || z > c.max.z) return null;
    if (c.shape === 'cylinder') {
      const cx = (c.min.x + c.max.x) / 2;
      const cz = (c.min.z + c.max.z) / 2;
      const r = c.radius ?? (c.max.x - c.min.x) / 2;
      if ((x - cx) ** 2 + (z - cz) ** 2 > r * r) return null;
      return c.max.y;
    }
    if (c.shape === 'ramp' && c.ramp) {
      const { axis, h0, h1 } = c.ramp;
      const t = axis === 'x' ? (x - c.min.x) / (c.max.x - c.min.x) : (z - c.min.z) / (c.max.z - c.min.z);
      return h0 + (h1 - h0) * Math.min(1, Math.max(0, t));
    }
    return c.max.y;
  }

  /** Altura da rampa no ponto mais próximo dentro da sua base (bordas generosas). */
  static rampTopClamped(c: Collider, x: number, z: number): number {
    const cx = Math.min(c.max.x, Math.max(c.min.x, x));
    const cz = Math.min(c.max.z, Math.max(c.min.z, z));
    return PhysicsWorld.topAt(c, cx, cz) ?? c.max.y;
  }

  /**
   * Procura o chão mais alto abaixo de (x, y, z) dentro de `maxDrop`.
   * Usado para "grudar" no chão ao descer rampas e para a sombra do personagem.
   */
  groundBelow(x: number, y: number, z: number, maxDrop: number, radius = 0): { y: number; collider: Collider } | null {
    let best: { y: number; collider: Collider } | null = null;
    const pts = radius > 0 ? [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]] : [[0, 0]];
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (c.max.y < y - maxDrop - 0.01 || c.min.y > y + 0.05) continue;
      for (const [ox, oz] of pts) {
        const top = PhysicsWorld.topAt(c, x + ox, z + oz);
        if (top === null) continue;
        if (top <= y + 0.05 && top >= y - maxDrop && (!best || top > best.y)) best = { y: top, collider: c };
      }
    }
    return best;
  }

  /** Raio contra os colisores (slab test nos AABBs). Retorna a distância do primeiro impacto. */
  raycast(origin: V3, dir: V3, maxDist: number, filter?: (c: Collider) => boolean): number | null {
    let best: number | null = null;
    for (const c of this.colliders) {
      if (!c.enabled || (filter && !filter(c))) continue;
      const t = rayAabb(origin, dir, c.min, c.max, maxDist);
      if (t !== null && (best === null || t < best)) best = t;
    }
    return best;
  }

  /** Colisores sólidos que intersectam a caixa. */
  overlapping(min: V3, max: V3, out: Collider[] = []): Collider[] {
    out.length = 0;
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (max.x <= c.min.x || min.x >= c.max.x) continue;
      if (max.y <= c.min.y || min.y >= c.max.y) continue;
      if (max.z <= c.min.z || min.z >= c.max.z) continue;
      out.push(c);
    }
    return out;
  }
}

export function rayAabb(o: V3, d: V3, min: V3, max: V3, maxDist: number): number | null {
  let tmin = 0;
  let tmax = maxDist;
  for (const a of ['x', 'y', 'z'] as const) {
    if (Math.abs(d[a]) < 1e-8) {
      if (o[a] < min[a] || o[a] > max[a]) return null;
    } else {
      const inv = 1 / d[a];
      let t1 = (min[a] - o[a]) * inv;
      let t2 = (max[a] - o[a]) * inv;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}
