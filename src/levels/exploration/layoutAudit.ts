import type { DifficultyId } from '../../core/types';
import { getDifficultyParams } from '../../data/difficulty';
import { REACH, REACH_MARGIN } from '../../data/reach';
import type { LayoutEntity, LevelLayout, Vec3 } from './LayoutTypes';

/**
 * VALIDADOR DE PERCURSO (seção 7.1 / 12 / 22: "verificar solvabilidade").
 *
 * Confere, por dados, se o que a fase pede cabe no que o personagem alcança:
 *  - todo item pedido (moeda, gema, ursinho dourado) tem de ter um apoio de onde dê para pegá-lo;
 *  - toda plataforma tem de ter uma vizinha dentro do alcance do pulo;
 *  - nada de objetivo pendurado sem caminho (B04, B10, B32, B03).
 *
 * É análise geométrica aproximada e conservadora: ela avisa o que PARECE fora de alcance
 * para um humano conferir, e é rodada como teste automático em todas as fases.
 */

export interface Support {
  /** Altura da superfície onde o personagem fica em pé. */
  top: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  what: string;
  /** Trampolim: lança muito mais alto. */
  trampoline?: boolean;
  /** Rede/escalada: dá acesso a toda a altura até `top`. */
  climb?: boolean;
}

export interface AuditIssue {
  kind: 'item-fora-de-alcance' | 'plataforma-isolada' | 'apoio-sem-saida';
  what: string;
  pos: Vec3;
  detail: string;
}

const dist2D = (x: number, z: number, s: Support) => {
  const dx = Math.max(s.minX - x, 0, x - s.maxX);
  const dz = Math.max(s.minZ - z, 0, z - s.maxZ);
  return Math.hypot(dx, dz);
};

/** Entidades do estilo pedido (ignora o que só existe em outro estilo). */
function entitiesFor(layout: LevelLayout, diff: DifficultyId): LayoutEntity[] {
  return layout.entities.filter((e) => !e.onlyIn || e.onlyIn.includes(diff));
}

/**
 * Todas as superfícies em que o personagem pode ficar em pé.
 * `mode`: 'pickup' trata cada ponta de uma plataforma móvel como um lugar diferente
 * (é de onde dá para pegar as coisas); 'connect' trata a plataforma móvel como UM apoio
 * que varre o trajeto inteiro (é como a criança atravessa de verdade).
 */
export function supportsOf(layout: LevelLayout, diff: DifficultyId, mode: 'pickup' | 'connect' = 'pickup'): Support[] {
  const scale = getDifficultyParams(diff).platformScale;
  const out: Support[] = [];
  const push = (s: Support) => out.push(s);
  for (const e of entitiesFor(layout, diff)) {
    switch (e.t) {
      case 'box': {
        if (e.surface === 'lava') break; // lava não é apoio
        push({ top: e.max[1], minX: e.min[0], maxX: e.max[0], minZ: e.min[2], maxZ: e.max[2], what: 'box' });
        break;
      }
      case 'platform': {
        const k = e.scales ? scale : 1;
        const w = (e.size[0] * k) / 2;
        const d = (e.size[1] * k) / 2;
        if (e.move && mode === 'connect') {
          const a = e.pos;
          const b2 = e.move.to;
          push({
            top: Math.min(a[1], b2[1]),
            minX: Math.min(a[0], b2[0]) - w,
            maxX: Math.max(a[0], b2[0]) + w,
            minZ: Math.min(a[2], b2[2]) - d,
            maxZ: Math.max(a[2], b2[2]) + d,
            what: 'plataforma móvel',
          });
          break;
        }
        const spots: Vec3[] = e.move ? [e.pos, e.move.to] : [e.pos];
        for (const p of spots) push({ top: p[1], minX: p[0] - w, maxX: p[0] + w, minZ: p[2] - d, maxZ: p[2] + d, what: 'plataforma' });
        break;
      }
      case 'vanish': {
        const w = e.size[0] / 2;
        const d = e.size[1] / 2;
        push({ top: e.pos[1], minX: e.pos[0] - w, maxX: e.pos[0] + w, minZ: e.pos[2] - d, maxZ: e.pos[2] + d, what: 'plataforma que some' });
        break;
      }
      case 'ramp': {
        // A rampa é andável de ponta a ponta: vale como apoio na altura mais baixa e na mais alta.
        for (const h of [e.h0, e.h1])
          push({ top: e.min[1] + h, minX: e.min[0], maxX: e.max[0], minZ: e.min[2], maxZ: e.max[2], what: 'rampa' });
        break;
      }
      case 'trampoline':
        push({ top: e.pos[1], minX: e.pos[0] - e.radius, maxX: e.pos[0] + e.radius, minZ: e.pos[2] - e.radius, maxZ: e.pos[2] + e.radius, what: 'trampolim', trampoline: true });
        break;
      case 'netBridge':
        push({ top: e.max[1], minX: e.min[0], maxX: e.max[0], minZ: e.min[2], maxZ: e.max[2], what: 'ponte de rede' });
        break;
      case 'net':
        push({ top: e.max[1], minX: e.min[0] - 1, maxX: e.max[0] + 1, minZ: e.min[2] - 1, maxZ: e.max[2] + 1, what: 'rede de escalada', climb: true });
        break;
      case 'ballpit':
        push({ top: e.min[1], minX: e.min[0], maxX: e.max[0], minZ: e.min[2], maxZ: e.max[2], what: 'piscina de bolinhas' });
        break;
      case 'tunnel': {
        const len = e.length;
        const a = e.start;
        const bx = e.axis === 'x' ? a[0] + len : a[0];
        const bz = e.axis === 'z' ? a[2] + len : a[2];
        push({ top: a[1], minX: Math.min(a[0], bx) - e.radius, maxX: Math.max(a[0], bx) + e.radius, minZ: Math.min(a[2], bz) - e.radius, maxZ: Math.max(a[2], bz) + e.radius, what: 'túnel' });
        break;
      }
      case 'prop':
        if (e.solid) {
          const s = (e.scale ?? 1) * 0.6;
          push({ top: e.pos[1] + s, minX: e.pos[0] - s, maxX: e.pos[0] + s, minZ: e.pos[2] - s, maxZ: e.pos[2] + s, what: `prop ${e.kind}` });
        }
        break;
      case 'bumper':
        push({ top: e.pos[1] + e.size[1] / 2, minX: e.pos[0] - e.size[0] / 2 - e.amplitude, maxX: e.pos[0] + e.size[0] / 2 + e.amplitude, minZ: e.pos[2] - e.size[2] / 2, maxZ: e.pos[2] + e.size[2] / 2, what: 'bumper' });
        break;
      default:
        break;
    }
  }
  return out;
}

/** Até onde o pulo sobe a partir deste apoio, e até onde ele chega de lado. */
function envelopeOf(s: Support): { apex: number; half: number } {
  // Trampolim: vários quiques seguidos sobem bem mais alto, e o voo é longo.
  if (s.trampoline) return { apex: REACH.trampoline[REACH.trampoline.length - 1], half: 7 };
  return { apex: REACH.jumpHeight, half: REACH.jumpDistanceWalk / 2 };
}

/** Altura alcançável acima de um apoio, considerando o desvio horizontal (balística). */
function reachableUp(s: Support, horiz: number, diff: DifficultyId): number {
  if (s.climb) return 0.2; // a rede dá acesso ao topo dela, não acima
  const { apex, half } = envelopeOf(s);
  if (horiz <= 0.05) return apex;
  if (horiz >= half) return 0;
  const t = horiz / half;
  const up = apex * (1 - t * t);
  return Math.max(0, up - REACH_MARGIN[diff] * 0.3);
}

export function auditLayout(layout: LevelLayout, diff: DifficultyId): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const supports = supportsOf(layout, diff);
  const margin = REACH_MARGIN[diff];
  const ents = entitiesFor(layout, diff);

  /** Dá para pegar um item nesta posição, saindo de algum apoio? */
  const canPick = (pos: Vec3, grab: number): { ok: boolean; best: string } => {
    let best = 'nenhum apoio por perto';
    let bestGap = Infinity;
    for (const s of supports) {
      const horiz = dist2D(pos[0], pos[2], s);
      const needUp = pos[1] - s.top;
      if (needUp < 0) {
        // Item ABAIXO do apoio: cair é sempre possível, e a queda também leva para o lado.
        const { half } = envelopeOf(s);
        if (horiz <= half + Math.abs(needUp) * 0.5) return { ok: true, best: `queda de ${s.what}` };
        continue;
      }
      if (horiz > REACH.jumpDistanceWalk + 3) continue;
      const can = reachableUp(s, horiz, diff) + REACH.pickup.chest + grab;
      if (needUp <= can) return { ok: true, best: s.what };
      const gap = needUp - can;
      if (gap < bestGap) {
        bestGap = gap;
        best = `${s.what} em y=${s.top.toFixed(1)} (faltam ${gap.toFixed(1)} m)`;
      }
    }
    return { ok: false, best };
  };

  for (const e of ents) {
    if (e.t === 'coin' || e.t === 'gem') {
      const r = canPick(e.pos, REACH.pickup.coin);
      if (!r.ok) issues.push({ kind: 'item-fora-de-alcance', what: e.t === 'gem' ? 'gema' : 'moeda', pos: e.pos, detail: r.best });
    }
    if (e.t === 'collectible') {
      const r = canPick(e.pos, REACH.pickup.collectible);
      if (!r.ok) issues.push({ kind: 'item-fora-de-alcance', what: `colecionável ${e.id}`, pos: e.pos, detail: r.best });
    }
    if (e.t === 'questItem') {
      const r = canPick(e.pos, REACH.pickup.collectible);
      if (!r.ok) issues.push({ kind: 'item-fora-de-alcance', what: `item de missão ${e.id}`, pos: e.pos, detail: r.best });
    }
    // Com quem a criança precisa CONVERSAR, onde ela precisa PISAR e a CHEGADA também
    // têm de estar ao alcance: uma missão inalcançável trava a aventura inteira.
    if (e.t === 'friend') {
      const r = canPick(e.pos, 1.4);
      if (!r.ok) issues.push({ kind: 'item-fora-de-alcance', what: `amigo ${e.id}`, pos: e.pos, detail: r.best });
    }
    if (e.t === 'pad') {
      const r = canPick(e.pos, 0.4);
      if (!r.ok) issues.push({ kind: 'item-fora-de-alcance', what: `botão de chão ${e.id}`, pos: e.pos, detail: r.best });
    }
    if (e.t === 'button') {
      const r = canPick(e.pos, 1.4);
      if (!r.ok) issues.push({ kind: 'item-fora-de-alcance', what: `botão ${e.id}`, pos: e.pos, detail: r.best });
    }
    if (e.t === 'finish') {
      const r = canPick(e.pos, 0.8);
      if (!r.ok) issues.push({ kind: 'item-fora-de-alcance', what: 'chegada', pos: e.pos, detail: r.best });
    }
    if (e.t === 'coinLine' || e.t === 'coinArc') {
      const pts: Vec3[] = e.t === 'coinLine' ? [e.from, e.to] : [[e.center[0], e.center[1] + (e.height ?? 1.5), e.center[2]]];
      for (const p of pts) {
        const r = canPick(p, REACH.pickup.coin);
        if (!r.ok) issues.push({ kind: 'item-fora-de-alcance', what: 'fileira de moedas', pos: p, detail: r.best });
      }
    }
  }

  // Plataformas isoladas: precisa existir uma vizinha dentro do pulo (andando, com margem).
  const jumpable = REACH.jumpDistanceWalk - margin;
  const linked = supportsOf(layout, diff, 'connect');
  for (const s of linked) {
    if (s.what !== 'plataforma' && s.what !== 'plataforma que some' && s.what !== 'plataforma móvel') continue;
    let found = false;
    for (const o of linked) {
      if (o === s) continue;
      const dx = Math.max(o.minX - s.maxX, s.minX - o.maxX, 0);
      const dz = Math.max(o.minZ - s.maxZ, s.minZ - o.maxZ, 0);
      const gap = Math.hypot(dx, dz);
      if (gap > jumpable) continue;
      const up = s.top - o.top; // subir de o para s
      if (up <= REACH.stepUpHeight - margin || o.trampoline) {
        found = true;
        break;
      }
    }
    if (!found)
      issues.push({
        kind: 'plataforma-isolada' as const,
        what: s.what,
        pos: [(s.minX + s.maxX) / 2, s.top, (s.minZ + s.maxZ) / 2],
        detail: `nenhum apoio a menos de ${jumpable.toFixed(1)} m e ${(REACH.stepUpHeight - margin).toFixed(1)} m abaixo`,
      });
  }
  // Buracos sem saída (B05): toda superfície em que dá para cair precisa ter uma saída
  // dentro do alcance do pulo. Foi assim que a personagem ficou presa perto da chegada.
  for (const s of linked) {
    if (s.what === 'rede de escalada' || s.trampoline) continue;
    const w = s.maxX - s.minX;
    const d = s.maxZ - s.minZ;
    // Parede fina ou cantinho: ninguém fica preso em pé num beiral — cai e pronto.
    if (Math.min(w, d) < 1.2 || w * d < 2.5) continue;
    let exit = false;
    for (const o of linked) {
      if (o === s) continue;
      const dx = Math.max(o.minX - s.maxX, s.minX - o.maxX, 0);
      const dz = Math.max(o.minZ - s.maxZ, s.minZ - o.maxZ, 0);
      const gap = Math.hypot(dx, dz);
      if (gap > jumpable) continue;
      if (o.top <= s.top + REACH.stepUpHeight - margin || o.trampoline || o.climb) {
        exit = true;
        break;
      }
    }
    if (!exit)
      issues.push({
        kind: 'apoio-sem-saida',
        what: s.what,
        pos: [(s.minX + s.maxX) / 2, s.top, (s.minZ + s.maxZ) / 2],
        detail: 'dá para cair aqui e não tem como sair pulando',
      });
  }
  return issues;
}

// ---------------------------------------------------------------------------------------
// BURACOS SEM SAÍDA (B05)
// ---------------------------------------------------------------------------------------

interface SolidBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  /** Parede/teto: bloqueia, mas ninguém fica em pé em cima. */
  wall?: boolean;
}

/** Caixas sólidas do nível (o que bloqueia e o que sustenta). */
function solidsOf(layout: LevelLayout, diff: DifficultyId): SolidBox[] {
  const scale = getDifficultyParams(diff).platformScale;
  const out: SolidBox[] = [];
  for (const e of entitiesFor(layout, diff)) {
    if (e.t === 'box') {
      if (e.surface === 'lava') continue;
      out.push({ minX: e.min[0], maxX: e.max[0], minZ: e.min[2], maxZ: e.max[2], minY: e.min[1], maxY: e.max[1], wall: e.style === 'wall' });
    } else if (e.t === 'platform') {
      const k = e.scales ? scale : 1;
      const w = (e.size[0] * k) / 2;
      const d = (e.size[1] * k) / 2;
      const th = e.thick ?? 0.5;
      for (const p of e.move ? [e.pos, e.move.to] : [e.pos])
        out.push({ minX: p[0] - w, maxX: p[0] + w, minZ: p[2] - d, maxZ: p[2] + d, minY: p[1] - th, maxY: p[1] });
    } else if (e.t === 'ramp') {
      out.push({ minX: e.min[0], maxX: e.max[0], minZ: e.min[2], maxZ: e.max[2], minY: e.min[1], maxY: e.min[1] + Math.max(e.h0, e.h1) });
    } else if (e.t === 'netBridge' || e.t === 'ballpit') {
      out.push({ minX: e.min[0], maxX: e.max[0], minZ: e.min[2], maxZ: e.max[2], minY: e.min[1] - 0.3, maxY: e.min[1] });
    }
  }
  return out;
}

/**
 * Procura regiões do CHÃO em que a criança consegue cair e não consegue mais sair
 * pulando — foi o que aconteceu no buraco ao lado do totem de chegada (B05).
 *
 * Como funciona: divide o nível em quadradinhos de 1 m, descobre em que altura dá para
 * ficar em pé no fundo de cada um, liga os vizinhos que o pulo alcança e vê quais
 * "ilhas" não se conectam ao ponto de partida. Analisa o andar de baixo (é onde se cai).
 */
export function findTraps(layout: LevelLayout, diff: DifficultyId): AuditIssue[] {
  const solids = solidsOf(layout, diff);
  if (!solids.length) return [];
  // Zonas em que cair JÁ devolve a criança ao ponto seguro (killZone e lava):
  // ali não existe armadilha, existe recomeço.
  const safeFalls: SolidBox[] = [];
  for (const e of entitiesFor(layout, diff)) {
    if (e.t === 'killZone') safeFalls.push({ minX: e.min[0], maxX: e.max[0], minZ: e.min[2], maxZ: e.max[2], minY: e.min[1], maxY: e.max[1] });
    if (e.t === 'box' && e.surface === 'lava') safeFalls.push({ minX: e.min[0], maxX: e.max[0], minZ: e.min[2], maxZ: e.max[2], minY: e.min[1], maxY: e.max[1] + 1.2 });
  }
  const STEP = 0.75;
  const HEAD = 1.3;
  const up = REACH.stepUpHeight - REACH_MARGIN[diff];
  const minX = Math.min(...solids.map((s) => s.minX));
  const maxX = Math.max(...solids.map((s) => s.maxX));
  const minZ = Math.min(...solids.map((s) => s.minZ));
  const maxZ = Math.max(...solids.map((s) => s.maxZ));
  const nx = Math.ceil((maxX - minX) / STEP);
  const nz = Math.ceil((maxZ - minZ) / STEP);
  if (nx * nz > 200000) return []; // nível gigante: não vale a pena (e não há caso assim)

  // Altura do fundo de cada quadradinho (null = não dá para ficar em pé lá embaixo).
  const top = new Float64Array(nx * nz).fill(NaN);
  /** Altura do que BLOQUEIA o quadradinho (parede, plataforma): dá para pular por cima? */
  const blockTop = new Float64Array(nx * nz).fill(0);
  /** O que bloqueia é parede/teto (ninguém fica em pé lá em cima). */
  const wallTop = new Uint8Array(nx * nz);
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      // Usa o QUADRADO do quadradinho, não o ponto do meio: uma parede de 50 cm
      // escapava entre dois pontos e o buraco parecia ligado ao resto da fase.
      const x0 = minX + ix * STEP;
      const x1 = x0 + STEP;
      const z0 = minZ + iz * STEP;
      const z1 = z0 + STEP;
      const covering = solids.filter((s) => s.maxX > x0 && s.minX < x1 && s.maxZ > z0 && s.minZ < z1);
      if (!covering.length) continue;
      const floorY = Math.min(...covering.map((s) => s.maxY));
      const blockers = covering.filter((s) => s.minY < floorY + HEAD - 0.05 && s.maxY > floorY + 0.05);
      // Cair aqui devolve ao checkpoint? Então não é buraco: é recomeço.
      const chest = floorY + 0.7;
      if (safeFalls.some((k) => k.maxX > x0 && k.minX < x1 && k.maxZ > z0 && k.minZ < z1 && k.minY <= chest && k.maxY >= chest)) continue;
      if (!blockers.length) top[ix * nz + iz] = floorY;
      else {
        const highest = blockers.reduce((a, b) => (b.maxY > a.maxY ? b : a));
        blockTop[ix * nz + iz] = highest.maxY;
        wallTop[ix * nz + iz] = highest.wall ? 1 : 0;
      }
    }
  }

  /**
   * Topo em que dá para FICAR EM PÉ sobre um quadradinho bloqueado. Só vale se a área
   * em cima for larga (uma parede de 50 cm não é lugar de ficar em pé) e tiver espaço
   * livre acima. É daqui que a criança pode CAIR num buraco.
   */
  const standTop = new Float64Array(nx * nz).fill(NaN);
  for (let ix = 1; ix < nx - 1; ix++) {
    for (let iz = 1; iz < nz - 1; iz++) {
      const i = ix * nz + iz;
      if (!blockTop[i]) continue;
      const h = blockTop[i];
      if (wallTop[i]) continue; // topo de parede/teto não é lugar de ficar em pé
      let similar = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const n = (ix + dx) * nz + (iz + dz);
        if (blockTop[n] && Math.abs(blockTop[n] - h) < 0.4) similar++;
      }
      if (similar < 3) continue; // topo estreito: parede, não plataforma
      const x0 = minX + ix * STEP;
      const z0 = minZ + iz * STEP;
      const above = solids.some(
        (sb) => sb.maxX > x0 && sb.minX < x0 + STEP && sb.maxZ > z0 && sb.minZ < z0 + STEP && sb.minY < h + HEAD && sb.maxY > h + 0.05,
      );
      if (!above) standTop[i] = h;
    }
  }

  // Ilhas ligadas pelo que o pulo alcança.
  const comp = new Int32Array(nx * nz).fill(-1);
  const comps: number[][] = [];
  for (let i = 0; i < nx * nz; i++) {
    if (Number.isNaN(top[i]) || comp[i] >= 0) continue;
    const id = comps.length;
    const cells: number[] = [];
    const stack = [i];
    comp[i] = id;
    while (stack.length) {
      const c = stack.pop()!;
      cells.push(c);
      const cx = Math.floor(c / nz);
      const cz = c % nz;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ax = cx + dx;
        const az = cz + dz;
        if (ax < 0 || az < 0 || ax >= nx || az >= nz) continue;
        const n = ax * nz + az;
        if (Number.isNaN(top[n]) || comp[n] >= 0) continue;
        if (top[n] - top[c] > up) continue; // subir alto demais
        comp[n] = id;
        stack.push(n);
      }
    }
    comps.push(cells);
  }

  // Ilha do ponto de partida (e de qualquer checkpoint): essas são "boas".
  const good = new Set<number>();
  const marks: Vec3[] = [layout.spawn.pos];
  for (const e of entitiesFor(layout, diff)) if (e.t === 'checkpoint' || e.t === 'finish') marks.push(e.pos);
  for (const m of marks) {
    const ix = Math.floor((m[0] - minX) / STEP);
    const iz = Math.floor((m[2] - minZ) / STEP);
    for (let dx = -4; dx <= 4; dx++)
      for (let dz = -4; dz <= 4; dz++) {
        const i = (ix + dx) * nz + (iz + dz);
        if (i >= 0 && i < comp.length && comp[i] >= 0) good.add(comp[i]);
      }
  }
  // O chão principal da fase é a maior ilha — é onde a criança anda e cai.
  let biggest = -1;
  comps.forEach((cells, id) => {
    if (biggest < 0 || cells.length > comps[biggest].length) biggest = id;
  });
  if (biggest >= 0) good.add(biggest);

  /**
   * Tem algo sólido na ALTURA h deste quadradinho? É o que diz se uma parede
   * atravessa o caminho na altura em que a criança está — e não só perto do chão.
   */
  const blockedAt = (ix: number, iz: number, h: number, band = HEAD): boolean => {
    const x0 = minX + ix * STEP;
    const z0 = minZ + iz * STEP;
    return solids.some((sb) => sb.maxX > x0 && sb.minX < x0 + STEP && sb.maxZ > z0 && sb.minZ < z0 + STEP && sb.minY < h + band && sb.maxY > h + 0.15);
  };

  /** O caminho entre dois quadradinhos passa, pulando por cima do que houver? */
  const clearPath = (ax: number, az: number, bx: number, bz: number): boolean => {
    const steps = Math.max(Math.abs(bx - ax), Math.abs(bz - az));
    const base = top[ax * nz + az];
    for (let i = 1; i < steps; i++) {
      const mx = Math.round(ax + ((bx - ax) * i) / steps);
      const mz = Math.round(az + ((bz - az) * i) / steps);
      const m = mx * nz + mz;
      if (m < 0 || m >= top.length) return false;
      if (!Number.isNaN(top[m])) continue; // dá para pisar: passa
      // Só passa se o obstáculo caber embaixo do pulo.
      if (blockedAt(mx, mz, base + REACH.jumpHeight, 0.2)) return false;
    }
    return true;
  };

  /** Do alto de `from` dá para cair em `to` sem bater numa parede mais alta ainda? */
  const clearFall = (ax: number, az: number, bx: number, bz: number, h: number): boolean => {
    const steps = Math.max(Math.abs(bx - ax), Math.abs(bz - az));
    for (let i = 1; i <= steps; i++) {
      const mx = Math.round(ax + ((bx - ax) * i) / steps);
      const mz = Math.round(az + ((bz - az) * i) / steps);
      const m = mx * nz + mz;
      if (m < 0 || m >= top.length) return false;
      // Parede na altura de quem está lá em cima: não dá para cair por ali.
      if (blockedAt(mx, mz, h)) return false;
    }
    return true;
  };

  const issues: AuditIssue[] = [];
  comps.forEach((cells, id) => {
    if (good.has(id)) return;
    const area = cells.length * STEP * STEP;
    if (area < 4) return; // pequeno demais para a criança parar lá
    // Dá para sair pulando para alguma ilha boa que esteja perto e no alcance?
    let escapes = false;
    for (const c of cells) {
      const cx = Math.floor(c / nz);
      const cz = c % nz;
      for (let dx = -4; dx <= 4 && !escapes; dx++)
        for (let dz = -4; dz <= 4; dz++) {
          const n = (cx + dx) * nz + (cz + dz);
          if (n < 0 || n >= comp.length) continue;
          if (Math.hypot(dx, dz) * STEP > REACH.jumpDistanceWalk - REACH_MARGIN[diff]) continue;
          // Sai pulando para outro chão, ou SUBINDO em cima de algo que está ao alcance
          // (caixa, degrau, mesa) — é o que uma criança faz de verdade.
          const other = comp[n] >= 0 && comp[n] !== id ? top[n] : Number.isNaN(standTop[n]) ? NaN : standTop[n];
          if (Number.isNaN(other) || other - top[c] > up) continue;
          // O pulo tem de PASSAR: nada de "escapar" atravessando uma parede.
          if (!clearPath(cx, cz, cx + dx, cz + dz)) continue;
          escapes = true;
          break;
        }
      if (escapes) break;
    }
    if (escapes) return;
    // Só é ARMADILHA se a criança consegue cair ali: precisa haver um lugar alto por
    // perto em que ela fica em pé. Área fechada sem acesso nenhum é só cenário.
    let canFallIn = false;
    let from = '';
    for (const c of cells) {
      const cx0 = Math.floor(c / nz);
      const cz0 = c % nz;
      for (let dx = -4; dx <= 4 && !canFallIn; dx++)
        for (let dz = -4; dz <= 4; dz++) {
          const n = (cx0 + dx) * nz + (cz0 + dz);
          if (n < 0 || n >= standTop.length || Number.isNaN(standTop[n])) continue;
          if (standTop[n] < top[c] + up + 0.5) continue;
          // A queda precisa ser possível: nada de "cair" atravessando uma parede alta.
          if (!clearFall(cx0 + dx, cz0 + dz, cx0, cz0, standTop[n])) continue;
          canFallIn = true;
          from = `cai de x ${(minX + (cx0 + dx + 0.5) * STEP).toFixed(1)}, y ${standTop[n].toFixed(1)}, z ${(minZ + (cz0 + dz + 0.5) * STEP).toFixed(1)}`;
          break;
        }
      if (canFallIn) break;
    }
    if (!canFallIn) return;
    const cx = cells.reduce((a, c) => a + Math.floor(c / nz), 0) / cells.length;
    const cz = cells.reduce((a, c) => a + (c % nz), 0) / cells.length;
    const xs = cells.map((c) => Math.floor(c / nz));
    const zs = cells.map((c) => c % nz);
    const bx0 = minX + Math.min(...xs) * STEP;
    const bx1 = minX + (Math.max(...xs) + 1) * STEP;
    const bz0 = minZ + Math.min(...zs) * STEP;
    const bz1 = minZ + (Math.max(...zs) + 1) * STEP;
    issues.push({
      kind: 'apoio-sem-saida',
      what: `buraco de ${Math.round(area)} m²`,
      pos: [+(minX + (cx + 0.5) * STEP).toFixed(1), +top[cells[0]].toFixed(1), +(minZ + (cz + 0.5) * STEP).toFixed(1)],
      detail: `a criança cai aqui e não consegue sair pulando — x ${bx0.toFixed(1)}..${bx1.toFixed(1)}, z ${bz0.toFixed(1)}..${bz1.toFixed(1)} (${from})`,
    });
  });
  return issues;
}
