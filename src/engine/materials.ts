import * as THREE from 'three';

/**
 * Materiais compartilhados (cache) — reaproveitar materiais reduz trocas de estado na GPU.
 * Estilo "toon" com 3 faixas de luz: leve, colorido e com cara de desenho animado.
 */
let gradient: THREE.DataTexture | null = null;

export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const cache = new Map<string, THREE.Material>();

export interface MatOpts {
  emissive?: number;
  transparent?: number;
  vertexColors?: boolean;
  side?: THREE.Side;
  map?: THREE.Texture;
  /** Material sem iluminação (neon, letreiros). */
  unlit?: boolean;
}

export function toon(color: THREE.ColorRepresentation, opts: MatOpts = {}): THREE.Material {
  const c = new THREE.Color(color);
  const key = [
    c.getHexString(),
    opts.emissive ?? 0,
    opts.transparent ?? 1,
    opts.vertexColors ? 'v' : '',
    opts.side ?? 0,
    opts.map?.uuid ?? '',
    opts.unlit ? 'u' : '',
  ].join('|');
  let m = cache.get(key);
  if (m) return m;
  if (opts.unlit) {
    m = new THREE.MeshBasicMaterial({
      color: c,
      map: opts.map ?? null,
      transparent: (opts.transparent ?? 1) < 1 || !!opts.map,
      opacity: opts.transparent ?? 1,
      side: opts.side ?? THREE.FrontSide,
      vertexColors: !!opts.vertexColors,
    });
  } else {
    const tm = new THREE.MeshToonMaterial({
      color: c,
      gradientMap: toonGradient(),
      map: opts.map ?? null,
      transparent: (opts.transparent ?? 1) < 1,
      opacity: opts.transparent ?? 1,
      side: opts.side ?? THREE.FrontSide,
      vertexColors: !!opts.vertexColors,
    });
    if (opts.emissive) {
      tm.emissive = c.clone();
      tm.emissiveIntensity = opts.emissive;
    }
    m = tm;
  }
  cache.set(key, m);
  return m;
}

/** Paleta oficial (seção 37): neon, roxo, verde, laranja, pink e amarelo. */
export const PALETTE = {
  purple: '#7b2cff',
  purpleLight: '#b48bff',
  purpleDark: '#4b1a9e',
  pink: '#ff3d9a',
  pinkLight: '#ff9ccc',
  green: '#39e07a',
  greenNeon: '#39ff88',
  orange: '#ff8a00',
  yellow: '#ffd60a',
  cyan: '#21d4fd',
  blue: '#3a7bff',
  white: '#ffffff',
  lavender: '#efe4ff',
} as const;

export const NEON_CYCLE = [PALETTE.purple, PALETTE.pink, PALETTE.green, PALETTE.orange, PALETTE.yellow, PALETTE.cyan];

/** Pinta cores por vértice em degradê vertical (ex.: moletom azul→verde do Jhow). */
export function verticalGradient(geo: THREE.BufferGeometry, bottom: string, top: string): THREE.BufferGeometry {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const cb = new THREE.Color(bottom);
  const ct = new THREE.Color(top);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - bb.min.y) / Math.max(1e-6, bb.max.y - bb.min.y);
    tmp.copy(cb).lerp(ct, t);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

const texCache = new Map<string, THREE.Texture>();

/** Textura de texto/letreiro desenhada em canvas (placeholder até existir a arte real). */
export function textTexture(
  text: string,
  opts: { color?: string; glow?: string; bg?: string; font?: number; width?: number; height?: number } = {},
): THREE.Texture {
  const key = JSON.stringify([text, opts]);
  const cached = texCache.get(key);
  if (cached) return cached;
  const w = opts.width ?? 1024;
  const h = opts.height ?? 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.font = `700 ${opts.font ?? 150}px Fredoka, "Baloo 2", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = 30;
  }
  ctx.fillStyle = opts.color ?? '#fff';
  const lines = text.split('\n');
  const lh = (opts.font ?? 150) * 1.05;
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh));
  if (opts.glow) ctx.fillText(text.includes('\n') ? '' : text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

/** Textura de tapete de espuma xadrez (piso dos brinquedos). */
export function checkerTexture(a: string, b: string, cells = 4): THREE.Texture {
  const key = `checker|${a}|${b}|${cells}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const s = size / cells;
  for (let y = 0; y < cells; y++)
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 ? a : b;
      ctx.fillRect(x * s, y * s, s, s);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 4;
      ctx.strokeRect(x * s + 2, y * s + 2, s - 4, s - 4);
    }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

/** Textura de rede (malha) com fundo transparente. */
export function netTexture(color: string): THREE.Texture {
  const key = `net|${color}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.stroke();
  ctx.strokeRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}
