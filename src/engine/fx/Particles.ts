import * as THREE from 'three';

/**
 * Sistema de partículas com POOL fixo (seção 36: limite de partículas, sem criar objetos
 * a cada quadro). Um único draw call para todas as partículas.
 */
interface P {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  r: number;
  g: number;
  b: number;
  drag: number;
}

let spriteTex: THREE.Texture | null = null;
function sprite(): THREE.Texture {
  if (spriteTex) return spriteTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  spriteTex = new THREE.CanvasTexture(c);
  return spriteTex;
}

export class Particles {
  readonly points: THREE.Points;
  private pool: P[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private cursor = 0;
  private tmpColor = new THREE.Color();
  /** Multiplicador global (qualidade baixa/movimento reduzido emitem menos). */
  density = 1;

  constructor(readonly max = 500) {
    this.positions = new Float32Array(max * 3);
    this.colors = new Float32Array(max * 3);
    this.sizes = new Float32Array(max);
    for (let i = 0; i < max; i++) {
      this.pool.push({ alive: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, size: 1, gravity: 0, r: 1, g: 1, b: 1, drag: 0 });
      this.positions[i * 3 + 1] = -9999;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: sprite() }, scale: { value: 600 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float scale;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec3 vColor;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          if (t.a < 0.05) discard;
          gl_FragColor = vec4(vColor, t.a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  setViewportHeight(h: number) {
    (this.points.material as THREE.ShaderMaterial).uniforms.scale.value = h * 0.6;
  }

  emit(
    pos: { x: number; y: number; z: number },
    count: number,
    opts: {
      colors: string[];
      speed?: number;
      up?: number;
      life?: number;
      size?: number;
      gravity?: number;
      spread?: number;
      drag?: number;
    },
  ) {
    const n = Math.max(1, Math.round(count * this.density));
    for (let i = 0; i < n; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;
      const sp = opts.speed ?? 3;
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.3) * Math.PI;
      const s = sp * (0.4 + Math.random() * 0.6);
      const spread = opts.spread ?? 0.2;
      p.alive = true;
      p.x = pos.x + (Math.random() - 0.5) * spread;
      p.y = pos.y + (Math.random() - 0.5) * spread;
      p.z = pos.z + (Math.random() - 0.5) * spread;
      p.vx = Math.cos(a) * Math.cos(e) * s;
      p.vz = Math.sin(a) * Math.cos(e) * s;
      p.vy = Math.abs(Math.sin(e)) * s + (opts.up ?? 0);
      p.maxLife = p.life = (opts.life ?? 0.8) * (0.7 + Math.random() * 0.6);
      p.size = (opts.size ?? 0.25) * (0.7 + Math.random() * 0.6);
      p.gravity = opts.gravity ?? 6;
      p.drag = opts.drag ?? 1.5;
      this.tmpColor.set(opts.colors[(Math.random() * opts.colors.length) | 0]);
      p.r = this.tmpColor.r;
      p.g = this.tmpColor.g;
      p.b = this.tmpColor.b;
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        this.positions[i * 3 + 1] = -9999;
        this.sizes[i] = 0;
        continue;
      }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vz *= d;
      p.vy = p.vy * d - p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const k = p.life / p.maxLife;
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;
      this.colors[i * 3] = p.r * k;
      this.colors[i * 3 + 1] = p.g * k;
      this.colors[i * 3 + 2] = p.b * k;
      this.sizes[i] = p.size * (0.4 + 0.6 * k);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.max; i++) {
      this.pool[i].alive = false;
      this.positions[i * 3 + 1] = -9999;
      this.sizes[i] = 0;
    }
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

export const FX_COLORS = {
  coin: ['#ffd60a', '#ffb000', '#fff3b0'],
  confetti: ['#ff3d9a', '#7b2cff', '#39ff88', '#ffd60a', '#21d4fd', '#ff8a00'],
  dust: ['#ffffff', '#e8dcff'],
  magic: ['#ffffff', '#b48bff', '#ff9ccc', '#9fe8ff'],
  checkpoint: ['#39ff88', '#ffffff', '#21d4fd'],
} as const;
