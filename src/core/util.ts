export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const damp = (a: number, b: number, lambda: number, dt: number) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Interpola ângulos pelo menor caminho. */
export function dampAngle(a: number, b: number, lambda: number, dt: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * (1 - Math.exp(-lambda * dt));
}

export function uid(prefix = 'id'): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}

export function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Gerador pseudoaleatório determinístico (para decoração reproduzível das fases). */
export function seededRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
