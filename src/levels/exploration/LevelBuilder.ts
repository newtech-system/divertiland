import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CharacterId, DifficultyId } from '../../core/types';
import { seededRandom } from '../../core/util';
import type { DifficultyParams } from '../../data/difficulty';
import { ProceduralAnimator } from '../../engine/character/AnimationController';
import { CharacterModel } from '../../engine/character/CharacterModel';
import { defaultLook } from '../../engine/character/looks';
import { NEON_CYCLE, PALETTE, checkerTexture, netTexture, textTexture, toon } from '../../engine/materials';
import { PhysicsWorld, makeBox, type Collider, type V3 } from '../../engine/physics/PhysicsWorld';
import type { LayoutEntity, LevelLayout, Vec3 } from './LayoutTypes';
import { makeProp } from '../../engine/props/Props';
import { attachModel } from '../../engine/ModelLibrary';

// ----------------------------------------------------------------------------- tipos de saída

export type TriggerKind = 'message' | 'secret' | 'kill' | 'finish' | 'checkpoint' | 'ballpit' | 'climb' | 'camera' | 'lava';

export interface Trigger {
  kind: TriggerKind;
  min: V3;
  max: V3;
  inside: boolean;
  data: any;
}

export interface CoinInfo {
  id: string;
  kind: 'coin' | 'gem';
  pos: THREE.Vector3;
  taken: boolean;
  index: number;
  /** Escondida dentro de um bloco surpresa até ser revelada. */
  hidden?: boolean;
}

export interface BumpBlock {
  collider: Collider;
  mesh: THREE.Mesh;
  used: boolean;
  coin: CoinInfo | null;
  bump: number;
}

export interface CheckpointInfo {
  id: string;
  pos: V3;
  yaw: number;
  order: number;
  flag: THREE.Mesh;
  active: boolean;
}

export interface Interactable {
  id: string;
  pos: V3;
  used: boolean;
  icon: string;
  onInteract: () => void;
  obj: THREE.Object3D;
  /** 'button' mostra "A porta abriu!"; 'talk' é conversa (pode repetir). */
  kind?: 'button' | 'talk';
}

type FriendDef = Extract<LayoutEntity, { t: 'friend' }>;
type QuestItemDef = Extract<LayoutEntity, { t: 'questItem' }>;
type PadDef = Extract<LayoutEntity, { t: 'pad' }>;
type TagFriendDef = Extract<LayoutEntity, { t: 'tagFriend' }>;

export interface FriendInfo {
  def: FriendDef;
  obj: THREE.Group;
  bubble: THREE.Sprite;
  interact: Interactable;
}
export interface QuestItemInfo {
  def: QuestItemDef;
  obj: THREE.Group;
  taken: boolean;
}
export interface PadInfo {
  def: PadDef;
  collider: Collider;
  mat: THREE.MeshToonMaterial;
  lit: boolean;
  glow: number;
}
export interface QuestGateInfo {
  id: string;
  flag: string;
  open: () => void;
  opened: boolean;
}
export interface TagFriendInfo {
  def: TagFriendDef;
  obj: THREE.Group;
}

export interface Hazard {
  kind?: 'bumper' | 'spinner' | 'pendulum';
  /** Retorna a direção do empurrão se o personagem (pés em p) está tocando, senão null. */
  test(p: V3, radius: number): { x: number; z: number; strength: number } | null;
  onHit?: () => void;
}

export interface NpcInfo {
  model: CharacterModel;
  animator: ProceduralAnimator;
  anim: 'wave' | 'dance' | 'idle';
  timer: number;
}

export interface BuiltLevel {
  root: THREE.Group;
  world: PhysicsWorld;
  coins: CoinInfo[];
  coinMeshes: { coin: THREE.InstancedMesh | null; gem: THREE.InstancedMesh | null };
  collectibles: { id: string; pos: THREE.Vector3; obj: THREE.Object3D; taken: boolean; look: 'teddy' | 'ring' | 'paw' }[];
  checkpoints: CheckpointInfo[];
  triggers: Trigger[];
  updaters: ((t: number, dt: number) => void)[];
  interactables: Interactable[];
  hazards: Hazard[];
  trampolines: { collider: Collider; mat: THREE.Object3D; squash: number }[];
  gates: Map<string, { open: () => void; opened: boolean }>;
  hintTrails: V3[][];
  npcs: NpcInfo[];
  finishPos: V3 | null;
  secretIds: string[];
  coinsTotal: number;
  /** Plataformas que reagem a quem pisa (ex.: as que somem). */
  standables: { collider: Collider; update: (standing: boolean, dt: number) => void }[];
  bumpBlocks: BumpBlock[];
  friends: FriendInfo[];
  questItems: QuestItemInfo[];
  pads: PadInfo[];
  questGates: QuestGateInfo[];
  tagFriends: TagFriendInfo[];
}

export interface BuildContext {
  difficulty: DifficultyId;
  params: DifficultyParams;
  playerCharacter: CharacterId;
  guideCharacter: CharacterId;
}

const ZERO: V3 = { x: 0, y: 0, z: 0 };
const v = (a: Vec3): V3 => ({ x: a[0], y: a[1], z: a[2] });

// ----------------------------------------------------------------------------- lote estático

/**
 * Junta toda a geometria parada por material em poucas malhas (poucos draw calls) —
 * essencial para rodar bem em celulares intermediários.
 */
class StaticBatcher {
  private groups = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(geo: THREE.BufferGeometry, mat: THREE.Material, matrix: THREE.Matrix4, worldUvScale = 0) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
    }
    if (!g.getAttribute('uv')) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    }
    g.applyMatrix4(matrix);
    if (worldUvScale > 0) worldUv(g, worldUvScale);
    const vc = (mat as any).vertexColors;
    if (vc && !g.getAttribute('color')) {
      const c = new Float32Array(g.getAttribute('position').count * 3).fill(1);
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    } else if (!vc && g.getAttribute('color')) g.deleteAttribute('color');
    let list = this.groups.get(mat);
    if (!list) this.groups.set(mat, (list = []));
    list.push(g);
    if (geo !== g) geo.dispose();
  }

  build(parent: THREE.Object3D) {
    for (const [mat, list] of this.groups) {
      const merged = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    }
    this.groups.clear();
  }
}

function worldUv(g: THREE.BufferGeometry, scale: number) {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u: number;
    let w: number;
    if (ny >= nx && ny >= nz) {
      u = pos.getX(i);
      w = pos.getZ(i);
    } else if (nx >= nz) {
      u = pos.getZ(i);
      w = pos.getY(i);
    } else {
      u = pos.getX(i);
      w = pos.getY(i);
    }
    uv.setXY(i, u / scale, w / scale);
  }
  uv.needsUpdate = true;
}

const m4 = (x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
    new THREE.Vector3(sx, sy, sz),
  );

// ----------------------------------------------------------------------------- construtor

export class LevelBuilder {
  private batch = new StaticBatcher();
  private out!: BuiltLevel;
  private colorIdx = 0;
  private lavaAnimated = false;
  private rand = seededRandom(1234);

  constructor(private ctx: BuildContext) {}

  build(layout: LevelLayout): BuiltLevel {
    const root = new THREE.Group();
    root.name = `level_${layout.id}`;
    this.out = {
      root,
      world: new PhysicsWorld(),
      coins: [],
      coinMeshes: { coin: null, gem: null },
      collectibles: [],
      checkpoints: [],
      triggers: [],
      updaters: [],
      interactables: [],
      hazards: [],
      trampolines: [],
      gates: new Map(),
      hintTrails: [],
      npcs: [],
      finishPos: null,
      secretIds: [],
      coinsTotal: 0,
      standables: [],
      bumpBlocks: [],
      friends: [],
      questItems: [],
      pads: [],
      questGates: [],
      tagFriends: [],
    };
    const coinPositions: { pos: THREE.Vector3; kind: 'coin' | 'gem'; block?: BumpBlock }[] = [];

    for (const e of layout.entities) {
      if (e.onlyIn && !e.onlyIn.includes(this.ctx.difficulty)) continue;
      this.entity(e, coinPositions);
    }

    this.buildCoins(coinPositions);
    this.batch.build(root);
    return this.out;
  }

  private nextNeon() {
    return NEON_CYCLE[this.colorIdx++ % NEON_CYCLE.length];
  }

  private solid(min: V3, max: V3, opts: Partial<Collider> = {}) {
    return this.out.world.add(makeBox(min, max, opts));
  }

  private trigger(kind: TriggerKind, min: V3, max: V3, data: any = {}) {
    this.out.triggers.push({ kind, min, max, inside: false, data });
  }

  private entity(e: LayoutEntity, coins: { pos: THREE.Vector3; kind: 'coin' | 'gem'; block?: BumpBlock }[]) {
    const o = this.out;
    switch (e.t) {
      case 'box': {
        const min = v(e.min);
        const max = v(e.max);
        const style = e.style ?? 'foam';
        this.solid(min, max, {
          surface: e.surface ?? 'normal',
          oneWay: e.oneWay,
          blocksCamera: e.camera ?? (style !== 'glass' && style !== 'invisible'),
        });
        if (e.surface === 'lava') this.trigger('lava', { x: min.x, y: max.y - 0.05, z: min.z }, { x: max.x, y: max.y + 0.3, z: max.z });
        if (e.model) this.realModel(e.model, { x: (min.x + max.x) / 2, y: min.y, z: (min.z + max.z) / 2 }, 0, () => this.boxVisual(min, max, style, e.color));
        else this.boxVisual(min, max, style, e.color);
        break;
      }
      case 'platform': {
        const k = e.scales ? this.ctx.params.platformScale : 1;
        const w = e.size[0] * k;
        const d = e.size[1] * k;
        const th = e.thick ?? 0.5;
        const p = v(e.pos);
        const color = e.color ?? this.nextNeon();
        if (!e.move && !e.spin) {
          if (e.shape === 'disc') {
            this.out.world.add(
              makeBox({ x: p.x - w / 2, y: p.y - th, z: p.z - w / 2 }, { x: p.x + w / 2, y: p.y, z: p.z + w / 2 }, { shape: 'cylinder', radius: w / 2 }),
            );
            this.batch.add(new THREE.CylinderGeometry(w / 2, w / 2 * 0.9, th, 24), toon(color), m4(p.x, p.y - th / 2, p.z));
          } else {
            const bmin = { x: p.x - w / 2, y: p.y - th, z: p.z - d / 2 };
            const bmax = { x: p.x + w / 2, y: p.y, z: p.z + d / 2 };
            this.solid(bmin, bmax);
            if (e.model) this.realModel(e.model, { x: p.x, y: p.y - th, z: p.z }, 0, () => this.boxVisual(bmin, bmax, 'foam', color));
            else this.boxVisual(bmin, bmax, 'foam', color);
          }
          break;
        }
        // Plataforma dinâmica (móvel ou giratória)
        const geo =
          e.shape === 'disc'
            ? new THREE.CylinderGeometry(w / 2, w / 2 * 0.9, th, 24)
            : new RoundedBoxGeometry(w, th, d, 2, Math.min(0.12, th * 0.3));
        const mesh = new THREE.Mesh(geo, toon(color));
        o.root.add(mesh);
        const stripe = new THREE.Mesh(
          e.shape === 'disc' ? new THREE.TorusGeometry(w / 2 * 0.75, 0.05, 6, 24) : new THREE.BoxGeometry(w * 0.8, 0.04, 0.12),
          toon('#ffffff', { emissive: 0.4 }),
        );
        if (e.shape === 'disc') stripe.rotation.x = Math.PI / 2;
        stripe.position.y = th / 2 + 0.01;
        mesh.add(stripe);
        const col = makeBox(
          { x: p.x - w / 2, y: p.y - th, z: p.z - (e.shape === 'disc' ? w : d) / 2 },
          { x: p.x + w / 2, y: p.y, z: p.z + (e.shape === 'disc' ? w : d) / 2 },
          e.shape === 'disc' ? { shape: 'cylinder', radius: w / 2 } : {},
        );
        o.world.add(col);
        const from = p;
        const to = e.move ? v(e.move.to) : p;
        const period = (e.move?.period ?? 4) / this.ctx.params.obstacleSpeedMul;
        const phase = e.move?.phase ?? 0;
        const spin = (e.spin ?? 0) * this.ctx.params.obstacleSpeedMul;
        const halfW = w / 2;
        const halfD = (e.shape === 'disc' ? w : d) / 2;
        let prev = { ...from };
        o.updaters.push((t, dt) => {
          const k2 = e.move ? 0.5 - 0.5 * Math.cos(((t / period) + phase) * Math.PI * 2) : 0;
          const cur = { x: from.x + (to.x - from.x) * k2, y: from.y + (to.y - from.y) * k2, z: from.z + (to.z - from.z) * k2 };
          col.min = { x: cur.x - halfW, y: cur.y - th, z: cur.z - halfD };
          col.max = { x: cur.x + halfW, y: cur.y, z: cur.z + halfD };
          col.velocity = dt > 0 ? { x: (cur.x - prev.x) / dt, y: (cur.y - prev.y) / dt, z: (cur.z - prev.z) / dt } : { ...ZERO };
          col.angularVelocity = spin;
          prev = cur;
          mesh.position.set(cur.x, cur.y - th / 2, cur.z);
          if (spin) mesh.rotation.y += spin * dt;
        });
        break;
      }
      case 'ramp': {
        const min = v(e.min);
        const max = v(e.max);
        this.out.world.add(
          makeBox(min, max, {
            shape: 'ramp',
            ramp: { axis: e.axis, h0: e.h0, h1: e.h1 },
            surface: e.slide ? 'slide' : 'normal',
            blocksCamera: false,
          }),
        );
        this.rampVisual(min, e.axis, e.h0, e.h1, max, e.color ?? (e.slide ? PALETTE.yellow : PALETTE.purpleLight), !!e.slide);
        if (e.rails) {
          // Laterais do escorregador (paredinhas com a mesma inclinação, só visuais + colisão)
          const len = e.axis === 'x' ? max.x - min.x : max.z - min.z;
          const steps = Math.ceil(len / 1.5);
          for (let i = 0; i < steps; i++) {
            const a0 = i / steps;
            const a1 = (i + 1) / steps;
            const h = e.h0 + (e.h1 - e.h0) * ((a0 + a1) / 2);
            for (const side of [0, 1]) {
              if (e.axis === 'z') {
                const x0 = side ? max.x : min.x - 0.25;
                const bmin = { x: x0, y: min.y, z: min.z + len * a0 };
                const bmax = { x: x0 + 0.25, y: h + 0.7, z: min.z + len * a1 };
                this.solid(bmin, bmax, { blocksCamera: false });
                this.boxVisual(bmin, bmax, 'foam', PALETTE.pink);
              } else {
                const z0 = side ? max.z : min.z - 0.25;
                const bmin = { x: min.x + len * a0, y: min.y, z: z0 };
                const bmax = { x: min.x + len * a1, y: h + 0.7, z: z0 + 0.25 };
                this.solid(bmin, bmax, { blocksCamera: false });
                this.boxVisual(bmin, bmax, 'foam', PALETTE.pink);
              }
            }
          }
        }
        break;
      }
      case 'tunnel':
        this.tunnel(e);
        break;
      case 'coin':
        coins.push({ pos: new THREE.Vector3(...e.pos), kind: 'coin' });
        break;
      case 'gem':
        coins.push({ pos: new THREE.Vector3(...e.pos), kind: 'gem' });
        break;
      case 'coinLine': {
        for (let i = 0; i < e.count; i++) {
          const k = e.count === 1 ? 0 : i / (e.count - 1);
          coins.push({
            pos: new THREE.Vector3(
              e.from[0] + (e.to[0] - e.from[0]) * k,
              e.from[1] + (e.to[1] - e.from[1]) * k,
              e.from[2] + (e.to[2] - e.from[2]) * k,
            ),
            kind: 'coin',
          });
        }
        break;
      }
      case 'coinArc': {
        for (let i = 0; i < e.count; i++) {
          const a = (i / e.count) * Math.PI * 2;
          coins.push({
            pos: new THREE.Vector3(e.center[0] + Math.cos(a) * e.radius, e.center[1] + (e.height ?? 0), e.center[2] + Math.sin(a) * e.radius),
            kind: 'coin',
          });
        }
        break;
      }
      case 'collectible': {
        const obj = e.look === 'ring' ? flyRing() : e.look === 'paw' ? pawClue() : goldenTeddy();
        obj.position.set(...e.pos);
        o.root.add(obj);
        const base = e.pos[1];
        const ring = e.look === 'ring' || e.look === 'paw';
        o.updaters.push((t) => {
          obj.rotation.y = ring ? Math.sin(t) * 0.3 : t * 1.6;
          obj.position.y = base + Math.sin(t * 2.5) * (ring ? 0.05 : 0.12);
        });
        o.collectibles.push({ id: e.id, pos: new THREE.Vector3(...e.pos), obj, taken: false, look: e.look ?? 'teddy' });
        break;
      }
      case 'checkpoint':
        this.checkpoint(e.id, v(e.pos), e.yaw ?? 0);
        break;
      case 'pendulum':
        this.pendulum(e);
        break;
      case 'prop': {
        const obj = makeProp(e.kind, e.color ?? this.nextNeon(), e.accent ?? PALETTE.yellow, e.scale ?? 1);
        obj.position.set(...e.pos);
        obj.rotation.y = e.rotY ?? 0;
        obj.updateMatrixWorld(true);
        if (e.model) {
          // Modelo real no lugar do brinquedo provisório (a colisão continua pela caixa do provisório).
          this.realModel(e.model, v(e.pos), e.rotY ?? 0, () => o.root.add(obj));
          if (e.solid) {
            const b = new THREE.Box3().setFromObject(obj);
            this.solid({ x: b.min.x, y: b.min.y, z: b.min.z }, { x: b.max.x, y: b.max.y, z: b.max.z });
          }
          break;
        }
        // Props parados entram no lote estático (poucos draw calls).
        obj.traverse((c) => {
          const m = c as THREE.Mesh;
          if (m.isMesh) this.batch.add(m.geometry, m.material as THREE.Material, m.matrixWorld.clone());
        });
        if (e.solid) {
          const b = new THREE.Box3().setFromObject(obj);
          this.solid({ x: b.min.x, y: b.min.y, z: b.min.z }, { x: b.max.x, y: b.max.y, z: b.max.z });
        }
        break;
      }
      case 'friend': {
        const obj = makeProp(e.kind, e.color ?? PALETTE.pink, e.accent ?? PALETTE.yellow, e.scale ?? 3);
        obj.position.set(...e.pos);
        obj.rotation.y = e.yaw ?? 0;
        o.root.add(obj);
        const box = new THREE.Box3().setFromObject(obj);
        this.solid({ x: box.min.x, y: box.min.y, z: box.min.z }, { x: box.max.x, y: box.max.y, z: box.max.z }, { blocksCamera: false });
        const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture('💬', { font: 180, width: 256, height: 256 }), transparent: true }));
        bubble.scale.setScalar(0.9);
        bubble.position.set(e.pos[0], box.max.y + 0.6, e.pos[2]);
        o.root.add(bubble);
        const baseY = bubble.position.y;
        o.updaters.push((t) => (bubble.position.y = baseY + Math.sin(t * 3) * 0.12));
        const interact: Interactable = {
          id: e.id,
          pos: { x: e.pos[0], y: e.pos[1] + 1, z: e.pos[2] },
          used: false,
          icon: '💬',
          obj,
          kind: 'talk',
          onInteract: () => {},
        };
        o.interactables.push(interact);
        o.friends.push({ def: e, obj, bubble, interact });
        break;
      }
      case 'questItem': {
        const obj = makeProp(e.kind, e.color ?? PALETTE.pink, PALETTE.yellow, e.scale ?? 1.4);
        obj.position.set(...e.pos);
        o.root.add(obj);
        const base = e.pos[1];
        const ph = this.rand() * 6;
        o.updaters.push((t) => {
          obj.rotation.y = t * 1.2 + ph;
          obj.position.y = base + Math.sin(t * 2.4 + ph) * 0.1;
        });
        o.questItems.push({ def: e, obj, taken: false });
        break;
      }
      case 'pad': {
        const p = v(e.pos);
        const col = this.solid({ x: p.x - 0.9, y: p.y - 0.2, z: p.z - 0.9 }, { x: p.x + 0.9, y: p.y + 0.12, z: p.z + 0.9 }, { tag: 'pad', blocksCamera: false });
        const mat = new THREE.MeshToonMaterial({ color: new THREE.Color(e.color).multiplyScalar(0.55) });
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.3, 24), mat);
        mesh.position.set(p.x, p.y - 0.03, p.z);
        o.root.add(mesh);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 24), toon('#ffffff', { unlit: true }));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(p.x, p.y + 0.13, p.z);
        o.root.add(ring);
        const info: PadInfo = { def: e, collider: col, mat, lit: false, glow: 0 };
        const full = new THREE.Color(e.color);
        const dim = new THREE.Color(e.color).multiplyScalar(0.55);
        o.updaters.push((_t, dt) => {
          info.glow = Math.max(info.lit ? 1 : 0, info.glow - dt * 3);
          mat.color.copy(dim).lerp(full, info.glow);
          mat.emissive = mat.emissive ?? new THREE.Color();
          mat.emissive.copy(full).multiplyScalar(info.glow * 0.5);
        });
        o.pads.push(info);
        break;
      }
      case 'questGate': {
        this.gate(e.id, v(e.min), v(e.max), e.color ?? PALETTE.purple);
        const g = o.gates.get(e.id)!;
        o.questGates.push({ id: e.id, flag: e.flag, open: g.open, get opened() { return g.opened; } } as QuestGateInfo);
        break;
      }
      case 'tagFriend': {
        const obj = makeProp(e.kind, e.color, e.accent ?? PALETTE.yellow, 2.4);
        obj.position.set(...e.pos);
        o.root.add(obj);
        o.tagFriends.push({ def: e, obj });
        break;
      }
      case 'bumpBlock': {
        const p = v(e.pos);
        const col = this.solid({ x: p.x - 0.55, y: p.y - 0.55, z: p.z - 0.55 }, { x: p.x + 0.55, y: p.y + 0.55, z: p.z + 0.55 }, { tag: 'bump' });
        const mat = new THREE.MeshToonMaterial({ color: '#ffffff', map: textTexture('?', { color: '#ffffff', bg: e.color ?? '#ffb000', font: 200, width: 256, height: 256 }) });
        const mesh = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.1, 1.1, 2, 0.1), mat);
        mesh.position.set(p.x, p.y, p.z);
        this.out.root.add(mesh);
        const blk: BumpBlock = { collider: col, mesh, used: false, coin: null, bump: 0 };
        this.out.bumpBlocks.push(blk);
        coins.push({ pos: new THREE.Vector3(p.x, p.y, p.z), kind: 'gem', block: blk });
        this.out.updaters.push((_t, dt) => {
          blk.bump = Math.max(0, blk.bump - dt * 4);
          mesh.position.y = p.y + Math.sin(blk.bump * Math.PI) * 0.35;
        });
        break;
      }
      case 'vanish':
        this.vanish(v(e.pos), e.size, e.color ?? PALETTE.pinkLight);
        break;
      case 'trampoline':
        this.trampoline(v(e.pos), e.radius, e.power ?? 1);
        break;
      case 'ballpit':
        this.ballpit(v(e.min), v(e.max), e.depth ?? 0.7);
        break;
      case 'net':
        this.net(v(e.min), v(e.max), e.normal, e.color ?? PALETTE.greenNeon);
        break;
      case 'netBridge': {
        const min = v(e.min);
        const max = v(e.max);
        this.solid(min, max, { blocksCamera: false });
        const w = max.x - min.x;
        const d = max.z - min.z;
        const tex = netTexture(e.color ?? '#ffffff').clone();
        tex.needsUpdate = true;
        tex.repeat.set(w / 0.6, d / 0.6);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.set((min.x + max.x) / 2, max.y, (min.z + max.z) / 2);
        o.root.add(plane);
        const base = max.y;
        o.updaters.push((t) => (plane.position.y = base + Math.sin(t * 3) * 0.02));
        // cordas laterais
        const ropeMat = toon(e.color ?? PALETTE.yellow);
        const long = w > d;
        for (const side of [-1, 1]) {
          const len = long ? w : d;
          const rope = new THREE.CylinderGeometry(0.05, 0.05, len, 6);
          const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(long ? 0 : Math.PI / 2, 0, long ? Math.PI / 2 : 0));
          m.setPosition(
            long ? (min.x + max.x) / 2 : side < 0 ? min.x : max.x,
            max.y + 0.9,
            long ? (side < 0 ? min.z : max.z) : (min.z + max.z) / 2,
          );
          this.batch.add(rope, ropeMat, m);
        }
        break;
      }
      case 'bumper':
        this.bumper(e);
        break;
      case 'spinner':
        this.spinner(e);
        break;
      case 'curtain':
        this.curtain(v(e.min), v(e.max), e.colors ?? [PALETTE.pink, PALETTE.yellow, PALETTE.green, PALETTE.purple]);
        break;
      case 'secretZone':
        this.trigger('secret', v(e.min), v(e.max), { id: e.id });
        o.secretIds.push(e.id);
        break;
      case 'finish':
        this.finish(v(e.pos), e.yaw ?? 0);
        break;
      case 'message':
        this.trigger('message', v(e.min), v(e.max), {
          id: e.id,
          text: e.text,
          icon: e.icon,
          mission: e.mission,
          tutorial: e.tutorial,
          minHint: e.minHint ?? 0,
        });
        break;
      case 'button':
        this.button(e.id, v(e.pos), e.target, e.yaw ?? 0);
        break;
      case 'gate':
        this.gate(e.id, v(e.min), v(e.max), e.color ?? PALETTE.orange);
        break;
      case 'killZone':
        this.trigger('kill', v(e.min), v(e.max));
        break;
      case 'hintTrail':
        if (this.ctx.params.hintLevel >= (e.minHint ?? 2)) o.hintTrails.push(e.points.map(v));
        break;
      case 'cameraZone':
        this.trigger('camera', v(e.min), v(e.max), { distance: e.distance, pitch: e.pitch });
        break;
      case 'npc': {
        const ch: CharacterId =
          e.character === 'guide'
            ? this.ctx.guideCharacter
            : e.character === 'friend'
              ? this.ctx.playerCharacter === 'jhow'
                ? 'mina'
                : 'jhow'
              : e.character;
        const model = new CharacterModel(ch, defaultLook(ch));
        model.object.position.set(...e.pos);
        model.object.rotation.y = e.yaw ?? 0;
        o.root.add(model.object);
        const animator = new ProceduralAnimator(model.rig);
        o.npcs.push({ model, animator, anim: e.anim ?? 'wave', timer: Math.random() * 2 });
        this.solid({ x: e.pos[0] - 0.35, y: e.pos[1], z: e.pos[2] - 0.35 }, { x: e.pos[0] + 0.35, y: e.pos[1] + 1.4, z: e.pos[2] + 0.35 }, { blocksCamera: false });
        break;
      }
      case 'sign':
        this.sign(v(e.pos), e.yaw ?? 0, e.text, e.color ?? PALETTE.purple, e.w ?? 2.4, e.h ?? 1.2);
        break;
      case 'decor':
        this.decor(e);
        break;
    }
  }

  // ----------------------------------------------------------------------------- visuais

  private boxVisual(min: V3, max: V3, style: string, color?: string) {
    const w = max.x - min.x;
    const h = max.y - min.y;
    const d = max.z - min.z;
    const c = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
    const mat4 = m4(c.x, c.y, c.z);
    switch (style) {
      case 'invisible':
        return;
      case 'mat': {
        const [a, b] = color ? [color, shade(color, 0.12)] : [PALETTE.purpleLight, '#c9b0ff'];
        const tex = checkerTexture(a, b, 2);
        this.batch.add(new THREE.BoxGeometry(w, h, d), toon('#ffffff', { map: tex }), mat4, 2.4);
        return;
      }
      case 'wall':
        this.batch.add(new THREE.BoxGeometry(w, h, d), toon(color ?? '#d9c6ff'), mat4);
        return;
      case 'neon':
        this.batch.add(new THREE.BoxGeometry(w, h, d), toon(color ?? PALETTE.pink, { unlit: true }), mat4);
        return;
      case 'lava': {
        // "Lava" de brincadeira: geleia neon animada (nada assustador).
        const tex = lavaTexture();
        if (!this.lavaAnimated) {
          this.lavaAnimated = true;
          this.out.updaters.push((t) => {
            tex.offset.set(t * 0.05, Math.sin(t * 0.7) * 0.05);
          });
        }
        this.batch.add(new THREE.BoxGeometry(w, h, d), toon('#ffffff', { map: tex, unlit: true }), mat4, 3);
        return;
      }
      case 'glass':
        this.batch.add(new THREE.BoxGeometry(w, h, d), toon(color ?? '#bfe9ff', { transparent: 0.35 }), mat4);
        return;
      case 'padded':
      case 'foam':
      default: {
        const r = Math.min(0.14, Math.min(w, h, d) * 0.3);
        this.batch.add(new RoundedBoxGeometry(w, h, d, 2, r), toon(color ?? this.nextNeon()), mat4);
      }
    }
  }

  private rampVisual(min: V3, axis: 'x' | 'z', h0: number, h1: number, max: V3, color: string, slide: boolean) {
    // Prisma: base retangular, topo inclinado.
    const geo = new THREE.BufferGeometry();
    const x0 = min.x;
    const x1 = max.x;
    const z0 = min.z;
    const z1 = max.z;
    const y0 = min.y;
    const top = (x: number, z: number) => (axis === 'x' ? (x === x0 ? h0 : h1) : z === z0 ? h0 : h1);
    const P = [
      [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
      [x0, top(x0, z0), z0], [x1, top(x1, z0), z0], [x1, top(x1, z1), z1], [x0, top(x0, z1), z1],
    ];
    const faces = [
      [4, 7, 6, 5], // topo
      [0, 1, 2, 3], // base
      [0, 4, 5, 1],
      [1, 5, 6, 2],
      [2, 6, 7, 3],
      [3, 7, 4, 0],
    ];
    const pos: number[] = [];
    for (const f of faces) {
      const [a, b, c, d] = f.map((i) => P[i]);
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    // Corrige orientação do topo se ficou invertida
    const n = geo.getAttribute('normal');
    if (n.getY(0) < 0) {
      const p = geo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i += 3) {
        const tx = p.getX(i + 1), ty = p.getY(i + 1), tz = p.getZ(i + 1);
        p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
        p.setXYZ(i + 2, tx, ty, tz);
      }
      geo.computeVertexNormals();
    }
    if (slide) {
      this.batch.add(geo, toon('#ffffff', { map: stripeTexture(color, '#ffffff') }), new THREE.Matrix4(), 1.6);
    } else {
      this.batch.add(geo, toon(color), new THREE.Matrix4());
    }
  }

  private tunnel(e: Extract<LayoutEntity, { t: 'tunnel' }>) {
    const o = this.out;
    const s = v(e.start);
    const r = e.radius;
    const L = e.length;
    const alongX = e.axis === 'x';
    // Colisão: chão, paredes e teto (caixas).
    const wallT = 0.4;
    const c = (a: number, b: number) => (alongX ? { x: s.x + a, y: 0, z: s.z + b } : { x: s.x + b, y: 0, z: s.z + a });
    const box = (a0: number, a1: number, b0: number, b1: number, y0: number, y1: number, opts: Partial<Collider> = {}) => {
      const p0 = c(a0, b0);
      const p1 = c(a1, b1);
      this.solid(
        { x: Math.min(p0.x, p1.x), y: s.y + y0, z: Math.min(p0.z, p1.z) },
        { x: Math.max(p0.x, p1.x), y: s.y + y1, z: Math.max(p0.z, p1.z) },
        opts,
      );
    };
    box(0, L, -r, r, -0.3, 0); // chão
    box(0, L, -r - wallT, -r * 0.8, 0, r * 2); // paredes
    box(0, L, r * 0.8, r + wallT, 0, r * 2);
    box(0, L, -r, r, r * 1.75, r * 2 + wallT); // teto
    // Visual: anéis coloridos alternados (cara de tubo de playground).
    const seg = 1.2;
    const n = Math.ceil(L / seg);
    for (let i = 0; i < n; i++) {
      const color = e.colors[i % e.colors.length];
      const geo = new THREE.CylinderGeometry(r, r, seg * 0.98, 20, 1, true);
      const mat = toon(color, { side: THREE.DoubleSide });
      const m = new THREE.Matrix4();
      const center = c(i * seg + seg / 2, 0);
      m.makeRotationFromEuler(new THREE.Euler(alongX ? 0 : Math.PI / 2, 0, alongX ? Math.PI / 2 : 0));
      m.setPosition(center.x, s.y + r * 0.95, center.z);
      this.batch.add(geo, mat, m);
    }
    // Aros de neon nas entradas
    for (const a of [0, L]) {
      const ring = new THREE.TorusGeometry(r * 1.02, 0.12, 8, 28);
      const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, alongX ? Math.PI / 2 : 0, 0));
      const p = c(a, 0);
      m.setPosition(p.x, s.y + r * 0.95, p.z);
      this.batch.add(ring, toon(PALETTE.yellow, { unlit: true }), m);
    }
    // Luzinhas dentro do túnel
    for (let i = 1; i < n; i += 2) {
      const p = c(i * seg, 0);
      const bulb = new THREE.SphereGeometry(0.09, 6, 6);
      this.batch.add(bulb, toon('#ffffff', { unlit: true }), m4(p.x, s.y + r * 1.75, p.z));
    }
    // Piso interno
    const floorGeo = new THREE.BoxGeometry(alongX ? L : r * 1.6, 0.05, alongX ? r * 1.6 : L);
    const fc = c(L / 2, 0);
    this.batch.add(floorGeo, toon(PALETTE.purpleDark), m4(fc.x, s.y + 0.01, fc.z));
    void o;
  }

  /**
   * Coloca um modelo 3D real (GLB) na posição dada. Se falhar, desenha o visual provisório
   * (`fallback`) — o gameplay e as colisões não mudam em nenhum caso.
   */
  private realModel(url: string, pos: V3, rotY: number, fallback: () => void) {
    const anchor = new THREE.Group();
    anchor.position.set(pos.x, pos.y, pos.z);
    anchor.rotation.y = rotY;
    this.out.root.add(anchor);
    const root = this.out.root;
    const batchFallback = () => {
      // O lote estático já foi montado; o provisório entra como malha avulsa.
      const tmp = new StaticBatcher();
      const prev = this.batch;
      this.batch = tmp;
      fallback();
      this.batch = prev;
      tmp.build(root);
    };
    attachModel(anchor, url, batchFallback);
  }

  private pendulum(e: Extract<LayoutEntity, { t: 'pendulum' }>) {
    const o = this.out;
    const pv = v(e.pivot);
    // Viga de apoio
    const beamLen = 2.4;
    this.batch.add(
      new THREE.BoxGeometry(e.axis === 'x' ? 0.3 : beamLen, 0.3, e.axis === 'x' ? beamLen : 0.3),
      toon(PALETTE.purpleDark),
      m4(pv.x, pv.y, pv.z),
    );
    const g = new THREE.Group();
    g.position.set(pv.x, pv.y, pv.z);
    const arm = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, e.length, 8), toon('#ffffff'));
    rod.position.y = -e.length / 2;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.6, 18), toon(e.color ?? PALETTE.pink));
    head.rotation.x = Math.PI / 2;
    head.position.y = -e.length;
    for (const sd of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.2, 18), toon(PALETTE.yellow));
      cap.rotation.x = Math.PI / 2;
      cap.position.set(0, -e.length, sd * 0.8);
      arm.add(cap);
    }
    arm.add(rod, head);
    g.add(arm);
    // O martelo balança no plano X/Y (axis x) ou Z/Y (axis z); a cabeça fica de lado.
    if (e.axis === 'z') g.rotation.y = -Math.PI / 2;
    o.root.add(g);
    const speed = e.speed * this.ctx.params.obstacleSpeedMul;
    const headPos = new THREE.Vector3();
    let ang = 0;
    let angPrev = 0;
    o.updaters.push((t) => {
      angPrev = ang;
      ang = Math.sin(t * speed + (e.phase ?? 0)) * e.amplitude;
      arm.rotation.z = ang;
      head.getWorldPosition(headPos);
    });
    o.hazards.push({
      test: (pp, r) => {
        const dx = pp.x - headPos.x;
        const dy = pp.y + 0.7 - headPos.y;
        const dz = pp.z - headPos.z;
        if (Math.abs(dy) > 1.3) return null;
        const swingAxisDelta = e.axis === 'x' ? dx : dz;
        const widthAxisDelta = e.axis === 'x' ? dz : dx;
        if (Math.abs(widthAxisDelta) > 0.9 + r || Math.abs(swingAxisDelta) > 0.75 + r) return null;
        const dir = Math.sign(ang - angPrev) || 1;
        // Empurra no sentido do balanço (rotação z positiva leva a cabeça para +x local).
        const sx = e.axis === 'x' ? dir : 0;
        const sz = e.axis === 'z' ? dir : 0;
        return { x: sx + dx * 0.2, z: sz + dz * 0.2, strength: 8 };
      },
    });
  }

  private vanish(p: V3, size: [number, number], color: string) {
    const o = this.out;
    const k = this.ctx.params.platformScale;
    const w = size[0] * k;
    const d = size[1] * k;
    const col = this.solid({ x: p.x - w / 2, y: p.y - 0.4, z: p.z - d / 2 }, { x: p.x + w / 2, y: p.y, z: p.z + d / 2 });
    const mat = new THREE.MeshToonMaterial({ color, transparent: true });
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, 0.4, d, 2, 0.08), mat);
    mesh.position.set(p.x, p.y - 0.2, p.z);
    const dots = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.02, d * 0.7), toon('#ffffff', { transparent: 0.6 }));
    dots.position.y = 0.21;
    mesh.add(dots);
    o.root.add(mesh);
    // Bicho-Preguiça: a plataforma demora mais para sumir.
    const holdTime = this.ctx.params.hintLevel >= 2 ? 1.8 : this.ctx.params.hintLevel === 1 ? 1.0 : 0.7;
    let timer = -1;
    let gone = 0;
    o.standables.push({
      collider: col,
      update: (standing, dt) => {
        if (gone > 0) {
          gone -= dt;
          if (gone <= 0) {
            col.enabled = true;
            mesh.visible = true;
            mat.opacity = 1;
            timer = -1;
          }
          return;
        }
        if (standing && timer < 0) timer = holdTime;
        if (timer >= 0) {
          timer -= dt;
          mesh.position.x = p.x + Math.sin(timer * 60) * 0.05;
          mat.opacity = 0.4 + 0.6 * Math.max(0, timer / holdTime);
          if (timer <= 0) {
            col.enabled = false;
            mesh.visible = false;
            gone = 2.6;
            mesh.position.x = p.x;
          }
        }
      },
    });
  }

  private checkpoint(id: string, p: V3, yaw: number) {
    const o = this.out;
    const g = new THREE.Group();
    g.position.set(p.x, p.y, p.z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), toon('#ffffff'));
    pole.position.y = 1.2;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.18, 16), toon(PALETTE.purple));
    base.position.y = 0.09;
    const flagMat = new THREE.MeshToonMaterial({ color: '#b9b9c8' });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), flagMat);
    flag.material.side = THREE.DoubleSide;
    flag.position.set(0.47, 2.05, 0);
    const star = new THREE.Mesh(starGeo(0.18, 0.08, 0.05), toon(PALETTE.yellow, { emissive: 0.4 }));
    star.position.y = 2.55;
    g.add(pole, base, flag, star);
    g.rotation.y = yaw;
    o.root.add(g);
    o.updaters.push((t) => {
      flag.rotation.y = Math.sin(t * 3 + p.x) * 0.25;
      star.rotation.y = t * 2;
    });
    o.checkpoints.push({ id, pos: p, yaw, order: o.checkpoints.length, flag, active: false });
    this.trigger('checkpoint', { x: p.x - 3, y: p.y - 0.5, z: p.z - 3 }, { x: p.x + 3, y: p.y + 3, z: p.z + 3 }, { id });
  }

  private trampoline(p: V3, r: number, power: number) {
    const o = this.out;
    const col = makeBox({ x: p.x - r, y: p.y - 0.6, z: p.z - r }, { x: p.x + r, y: p.y, z: p.z + r }, {
      shape: 'cylinder',
      radius: r,
      surface: 'trampoline',
      data: { power },
      blocksCamera: false,
    });
    o.world.add(col);
    const frame = new THREE.TorusGeometry(r, 0.14, 8, 28);
    const fm = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    fm.setPosition(p.x, p.y - 0.05, p.z);
    this.batch.add(frame, toon(PALETTE.cyan), fm);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      this.batch.add(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), toon(PALETTE.purpleDark), m4(p.x + Math.cos(a) * r * 0.85, p.y - 0.35, p.z + Math.sin(a) * r * 0.85));
    }
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.06, 28), toon(PALETTE.purpleDark));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.55, 0.06, 6, 24), toon(PALETTE.greenNeon, { unlit: true }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    mat.add(ring);
    mat.position.set(p.x, p.y - 0.06, p.z);
    o.root.add(mat);
    const entry = { collider: col, mat, squash: 0 };
    o.trampolines.push(entry);
    o.updaters.push((_t, dt) => {
      entry.squash = Math.max(0, entry.squash - dt * 4);
      mat.position.y = p.y - 0.06 - Math.sin(entry.squash * Math.PI) * 0.25;
    });
  }

  private ballpit(min: V3, max: V3, depth: number) {
    const o = this.out;
    // Fundo com superfície "pegajosa" (anda mais devagar, como na piscina de bolinhas).
    this.solid({ x: min.x, y: min.y - 0.3, z: min.z }, { x: max.x, y: min.y, z: max.z }, { surface: 'sticky' });
    this.trigger('ballpit', min, { x: max.x, y: min.y + depth + 0.3, z: max.z });
    const area = (max.x - min.x) * (max.z - min.z);
    const count = Math.min(1400, Math.floor(area * depth * 22));
    const geo = new THREE.SphereGeometry(0.16, 8, 6);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: '#ffffff' }), count);
    const colors = [PALETTE.pink, PALETTE.yellow, PALETTE.greenNeon, PALETTE.cyan, PALETTE.purple, PALETTE.orange, '#ffffff'];
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      m.setPosition(
        min.x + 0.15 + this.rand() * (max.x - min.x - 0.3),
        min.y + 0.12 + this.rand() * depth,
        min.z + 0.15 + this.rand() * (max.z - min.z - 0.3),
      );
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(colors[i % colors.length]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    o.root.add(mesh);
  }

  private net(min: V3, max: V3, normal: [number, number], color: string) {
    const o = this.out;
    this.solid(min, max, { blocksCamera: false });
    // Zona de escalada na frente da rede
    const nx = normal[0];
    const nz = normal[1];
    const zmin = { x: Math.min(min.x, min.x + nx * 0.9), y: min.y, z: Math.min(min.z, min.z + nz * 0.9) };
    const zmax = { x: Math.max(max.x, max.x + nx * 0.9), y: max.y + 0.2, z: Math.max(max.z, max.z + nz * 0.9) };
    this.trigger('climb', zmin, zmax, { normal: { x: nx, z: nz }, topY: max.y });
    const w = Math.abs(nx) > 0.5 ? max.z - min.z : max.x - min.x;
    const h = max.y - min.y;
    const tex = netTexture(color).clone();
    tex.needsUpdate = true;
    tex.repeat.set(w / 0.5, h / 0.5);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    plane.position.set((min.x + max.x) / 2 + nx * 0.25, (min.y + max.y) / 2, (min.z + max.z) / 2 + nz * 0.25);
    plane.rotation.y = Math.atan2(nx, nz);
    o.root.add(plane);
    // Moldura
    const frameMat = toon(PALETTE.purple);
    for (const side of [-1, 1]) {
      const px = (min.x + max.x) / 2 + (Math.abs(nz) > 0.5 ? (side * w) / 2 : 0) + nx * 0.25;
      const pz = (min.z + max.z) / 2 + (Math.abs(nx) > 0.5 ? (side * w) / 2 : 0) + nz * 0.25;
      this.batch.add(new THREE.CylinderGeometry(0.1, 0.1, h + 0.4, 8), frameMat, m4(px, min.y + h / 2, pz));
    }
  }

  private bumper(e: Extract<LayoutEntity, { t: 'bumper' }>) {
    const o = this.out;
    const p = v(e.pos);
    const [sx, sy, sz] = e.size;
    const color = e.color ?? PALETTE.pink;
    const group = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(sx, sy, sz, 3, Math.min(sx, sy, sz) * 0.35), toon(color));
    const face = new THREE.Mesh(new THREE.SphereGeometry(Math.min(sx, sz) * 0.18, 10, 8), toon('#ffffff'));
    group.add(body);
    for (const side of [-1, 1]) {
      const eye = face.clone();
      eye.position.set(side * sx * 0.2, sy * 0.15, sz / 2);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(Math.min(sx, sz) * 0.08, 8, 6), toon('#1b1430'));
      pupil.position.set(0, 0, Math.min(sx, sz) * 0.14);
      eye.add(pupil);
      group.add(eye);
    }
    o.root.add(group);
    const col = makeBox({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { blocksCamera: false });
    o.world.add(col);
    const speed = e.speed * this.ctx.params.obstacleSpeedMul;
    let prev = { ...p };
    let squish = 0;
    const cur = { ...p };
    o.updaters.push((t, dt) => {
      const off = Math.sin(t * speed + (e.phase ?? 0)) * e.amplitude;
      cur.x = p.x + (e.axis === 'x' ? off : 0);
      cur.z = p.z + (e.axis === 'z' ? off : 0);
      col.min = { x: cur.x - sx / 2, y: p.y, z: cur.z - sz / 2 };
      col.max = { x: cur.x + sx / 2, y: p.y + sy, z: cur.z + sz / 2 };
      col.velocity = dt > 0 ? { x: (cur.x - prev.x) / dt, y: 0, z: (cur.z - prev.z) / dt } : { ...ZERO };
      prev = { ...cur };
      squish = Math.max(0, squish - dt * 3);
      const s = 1 + Math.sin(squish * Math.PI) * 0.15;
      group.scale.set(s, 1 / s, s);
      group.position.set(cur.x, p.y + sy / 2, cur.z);
      // Olha na direção do movimento
      group.rotation.y = e.axis === 'x' ? (Math.cos(t * speed + (e.phase ?? 0)) > 0 ? Math.PI / 2 : -Math.PI / 2) : Math.cos(t * speed + (e.phase ?? 0)) > 0 ? 0 : Math.PI;
    });
    o.hazards.push({
      test: (pp, r) => {
        if (pp.y > p.y + sy || pp.y + 1.4 < p.y) return null;
        const dx = pp.x - cur.x;
        const dz = pp.z - cur.z;
        if (Math.abs(dx) > sx / 2 + r + 0.12 || Math.abs(dz) > sz / 2 + r + 0.12) return null;
        squish = 1;
        // empurra para longe, a favor do movimento do bloco
        const vx = col.velocity.x;
        const vz = col.velocity.z;
        const sp = Math.hypot(vx, vz);
        if (sp > 0.5) return { x: vx / sp + dx * 0.3, z: vz / sp + dz * 0.3, strength: 9 };
        return { x: dx, z: dz, strength: 7 };
      },
    });
  }

  private spinner(e: Extract<LayoutEntity, { t: 'spinner' }>) {
    const o = this.out;
    const p = v(e.pos);
    const h = e.height ?? 0.55;
    const group = new THREE.Group();
    group.position.set(p.x, p.y, p.z);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, h + 0.5, 16), toon(PALETTE.purple));
    hub.position.y = (h + 0.5) / 2;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, e.length * 2, 12), toon(e.color ?? PALETTE.orange));
    arm.rotation.z = Math.PI / 2;
    arm.position.y = h;
    const stripes = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, e.length * 2, 12, 1, true), toon(PALETTE.yellow, { transparent: 0.0 }));
    void stripes;
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), toon(PALETTE.pink));
      cap.position.set(side * e.length, h, 0);
      group.add(cap);
    }
    group.add(hub, arm);
    o.root.add(group);
    this.out.world.add(makeBox({ x: p.x - 0.45, y: p.y, z: p.z - 0.45 }, { x: p.x + 0.45, y: p.y + h + 0.5, z: p.z + 0.45 }, { shape: 'cylinder', radius: 0.45 }));
    const speed = e.speed * this.ctx.params.obstacleSpeedMul;
    let angle = 0;
    o.updaters.push((_t, dt) => {
      angle += speed * dt;
      group.rotation.y = angle;
    });
    o.hazards.push({
      kind: 'spinner',
      test: (pp, r) => {
        if (pp.y > p.y + h + 0.25 || pp.y + 1.4 < p.y + h - 0.25) return null;
        // Distância do ponto ao segmento do braço (no plano XZ)
        const ax = Math.cos(angle);
        const az = -Math.sin(angle);
        const dx = pp.x - p.x;
        const dz = pp.z - p.z;
        const along = dx * ax + dz * az;
        if (Math.abs(along) > e.length + r) return null;
        const perp = -dx * az + dz * ax;
        if (Math.abs(perp) > 0.22 + r) return null;
        // Empurra no sentido da rotação
        const dir = Math.sign(along) * Math.sign(speed);
        return { x: -az * dir * -1 + dx * 0.2, z: ax * dir * -1 + dz * 0.2, strength: 8 };
      },
    });
  }

  private curtain(min: V3, max: V3, colors: string[]) {
    // Cortina de fitas: parece parede, mas dá para atravessar (entrada de segredo).
    const o = this.out;
    const alongX = max.x - min.x > max.z - min.z;
    const w = alongX ? max.x - min.x : max.z - min.z;
    const n = Math.max(4, Math.round(w / 0.28));
    const strips: THREE.Mesh[] = [];
    for (let i = 0; i < n; i++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(w / n, max.y - min.y), toon(colors[i % colors.length], { side: THREE.DoubleSide }));
      const k = (i + 0.5) / n;
      strip.position.set(alongX ? min.x + w * k : (min.x + max.x) / 2, (min.y + max.y) / 2, alongX ? (min.z + max.z) / 2 : min.z + w * k);
      strip.rotation.y = alongX ? 0 : Math.PI / 2;
      o.root.add(strip);
      strips.push(strip);
    }
    o.updaters.push((t) => {
      strips.forEach((s, i) => (s.rotation.x = Math.sin(t * 2 + i * 0.7) * 0.06));
    });
  }

  private finish(p: V3, yaw: number) {
    const o = this.out;
    o.finishPos = p;
    const g = new THREE.Group();
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = yaw;
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.4, 32), toon(PALETTE.yellow));
    podium.position.y = 0.2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.2, 10, 40, Math.PI), toon(PALETTE.pink, { unlit: true }));
    ring.position.y = 0.3;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.1, 8, 40, Math.PI), toon(PALETTE.cyan, { unlit: true }));
    ring2.position.y = 0.3;
    const star = new THREE.Mesh(starGeo(0.8, 0.38, 0.25), toon(PALETTE.yellow, { emissive: 0.6 }));
    star.position.y = 3.6;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.9),
      toon('#ffffff', { unlit: true, map: textTexture('CHEGADA!', { color: '#ffffff', glow: '#ff3d9a', font: 160 }) }),
    );
    sign.position.set(0, 2.55, 0.05);
    const signBack = sign.clone();
    signBack.rotation.y = Math.PI;
    g.add(podium, ring, ring2, star, sign, signBack);
    o.root.add(g);
    o.updaters.push((t) => {
      star.rotation.y = t * 1.5;
      star.position.y = 3.6 + Math.sin(t * 2) * 0.15;
    });
    this.solid({ x: p.x - 2, y: p.y, z: p.z - 2 }, { x: p.x + 2, y: p.y + 0.4, z: p.z + 2 }, { blocksCamera: false });
    this.trigger('finish', { x: p.x - 1.8, y: p.y, z: p.z - 1.8 }, { x: p.x + 1.8, y: p.y + 3, z: p.z + 1.8 });
  }

  private button(id: string, p: V3, target: string, yaw: number) {
    const o = this.out;
    const g = new THREE.Group();
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = yaw;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 16), toon(PALETTE.purple));
    stand.position.y = 0.45;
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.2, 20), toon('#ff3d3d', { emissive: 0.3 }));
    btn.position.y = 1.0;
    g.add(stand, btn);
    o.root.add(g);
    this.solid({ x: p.x - 0.4, y: p.y, z: p.z - 0.4 }, { x: p.x + 0.4, y: p.y + 1.0, z: p.z + 0.4 });
    let pulse = 0;
    const entry: Interactable = {
      id,
      pos: { x: p.x, y: p.y + 1, z: p.z },
      used: false,
      icon: '🔴',
      obj: g,
      onInteract: () => {
        if (entry.used) return;
        entry.used = true;
        btn.position.y = 0.92;
        (btn.material as THREE.Material) = toon('#39ff88', { emissive: 0.4 });
        o.gates.get(target)?.open();
      },
    };
    o.interactables.push(entry);
    o.updaters.push((_t, dt) => {
      pulse += dt;
      if (!entry.used) btn.scale.setScalar(1 + Math.sin(pulse * 5) * 0.06);
    });
  }

  private gate(id: string, min: V3, max: V3, color: string) {
    const o = this.out;
    const col = this.solid(min, max);
    const w = max.x - min.x;
    const h = max.y - min.y;
    const d = max.z - min.z;
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.1), toon(color));
    const lock = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(w, d) > 0.6 ? 1 : 1.2, 1.2),
      toon('#ffffff', { unlit: true, map: textTexture('🔒', { font: 180, width: 256, height: 256 }) }),
    );
    lock.position.set(0, 0, d / 2 + 0.02);
    const lock2 = lock.clone();
    lock2.rotation.y = Math.PI;
    lock2.position.z = -d / 2 - 0.02;
    if (w < d) {
      lock.rotation.y = Math.PI / 2;
      lock.position.set(w / 2 + 0.02, 0, 0);
      lock2.rotation.y = -Math.PI / 2;
      lock2.position.set(-w / 2 - 0.02, 0, 0);
    }
    mesh.add(lock, lock2);
    mesh.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    o.root.add(mesh);
    let opening = false;
    const state = { opened: false, open: () => {} };
    state.open = () => {
      if (state.opened) return;
      state.opened = true;
      opening = true;
      col.enabled = false;
    };
    const baseY = mesh.position.y;
    o.updaters.push((_t, dt) => {
      if (!opening) return;
      mesh.position.y -= dt * 2.5;
      if (mesh.position.y < baseY - h) {
        mesh.visible = false;
        opening = false;
      }
    });
    o.gates.set(id, state);
  }

  private sign(p: V3, yaw: number, text: string, color: string, w: number, h: number) {
    const tex = textTexture(text, { color: '#ffffff', bg: color, font: text.length > 12 ? 70 : 110, width: 1024, height: 512 });
    const mat = toon('#ffffff', { map: tex, unlit: true });
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Matrix4().makeRotationY(yaw);
    m.setPosition(p.x, p.y, p.z);
    this.batch.add(g, mat, m);
    const back = new THREE.BoxGeometry(w + 0.15, h + 0.15, 0.08);
    const mb = new THREE.Matrix4().makeRotationY(yaw);
    const off = new THREE.Vector3(0, 0, -0.06).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    mb.setPosition(p.x + off.x, p.y, p.z + off.z);
    this.batch.add(back, toon('#ffffff'), mb);
  }

  private decor(e: Extract<LayoutEntity, { t: 'decor' }>) {
    const o = this.out;
    const p = v(e.pos);
    const yaw = e.yaw ?? 0;
    const color = e.color ?? this.nextNeon();
    const size = e.size ?? 1;
    switch (e.kind) {
      case 'neonSign': {
        const text = e.text ?? 'DIVERTILAND';
        const w = size * Math.max(3, text.length * 0.55);
        const h = size * 1.3;
        const tex = textTexture(text, { color: '#ffffff', glow: color, font: 150 });
        const m = new THREE.Matrix4().makeRotationY(yaw);
        m.setPosition(p.x, p.y, p.z);
        this.batch.add(new THREE.PlaneGeometry(w, h), toon('#ffffff', { map: tex, unlit: true }), m);
        const back = new THREE.Matrix4().makeRotationY(yaw);
        const off = new THREE.Vector3(0, 0, -0.08).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        back.setPosition(p.x + off.x, p.y, p.z + off.z);
        this.batch.add(new RoundedBoxGeometry(w + 0.4, h + 0.3, 0.12, 2, 0.05), toon(PALETTE.purpleDark), back);
        break;
      }
      case 'arch': {
        const r = 3 * size;
        const m = new THREE.Matrix4().makeRotationY(yaw);
        m.setPosition(p.x, p.y, p.z);
        const segs = 7;
        for (let i = 0; i < segs; i++) {
          const arc = new THREE.TorusGeometry(r, 0.35 * size, 10, 6, Math.PI / segs);
          arc.rotateZ((i * Math.PI) / segs);
          this.batch.add(arc, toon(NEON_CYCLE[i % NEON_CYCLE.length], { emissive: 0.35 }), m);
        }
        const inner = new THREE.TorusGeometry(r - 0.45 * size, 0.08, 6, 30, Math.PI);
        this.batch.add(inner, toon('#ffffff', { unlit: true }), m);
        break;
      }
      case 'pillar': {
        const h = 6 * size;
        const r = 0.45;
        const n = Math.ceil(h / 0.8);
        for (let i = 0; i < n; i++) {
          this.batch.add(new THREE.CylinderGeometry(r, r, 0.8, 14), toon(i % 2 ? '#ffffff' : color), m4(p.x, p.y + 0.4 + i * 0.8, p.z));
        }
        this.out.world.add(makeBox({ x: p.x - r, y: p.y, z: p.z - r }, { x: p.x + r, y: p.y + h, z: p.z + r }, { shape: 'cylinder', radius: r }));
        break;
      }
      case 'balloons': {
        const g = new THREE.Group();
        g.position.set(p.x, p.y, p.z);
        const cols = [PALETTE.pink, PALETTE.yellow, PALETTE.cyan, PALETTE.green, PALETTE.purple];
        for (let i = 0; i < 4; i++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.35 * size, 14, 12), toon(cols[(i + this.colorIdx) % cols.length]));
          b.scale.y = 1.2;
          b.position.set((i % 2 - 0.5) * 0.6 * size, 1.6 * size + (i > 1 ? 0.5 : 0) * size, ((i >> 1) - 0.5) * 0.4 * size);
          g.add(b);
          const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.6 * size, 4), toon('#ffffff'));
          string.position.set(b.position.x * 0.5, 0.8 * size, b.position.z * 0.5);
          g.add(string);
        }
        this.colorIdx++;
        o.root.add(g);
        const ph = this.rand() * 6;
        o.updaters.push((t) => {
          g.position.y = p.y + Math.sin(t * 1.3 + ph) * 0.12;
          g.rotation.y = Math.sin(t * 0.5 + ph) * 0.3;
        });
        break;
      }
      case 'star': {
        const star = new THREE.Mesh(starGeo(0.6 * size, 0.28 * size, 0.18 * size), toon(color, { emissive: 0.5 }));
        star.position.set(p.x, p.y, p.z);
        o.root.add(star);
        const ph = this.rand() * 6;
        o.updaters.push((t) => {
          star.rotation.y = t * 0.8 + ph;
          star.position.y = p.y + Math.sin(t + ph) * 0.2;
        });
        break;
      }
      case 'lightPanel': {
        this.batch.add(new THREE.BoxGeometry(2 * size, 0.1, 2 * size), toon(color, { unlit: true }), m4(p.x, p.y, p.z));
        break;
      }
      case 'cushion': {
        const s = size;
        this.solid({ x: p.x - 0.6 * s, y: p.y, z: p.z - 0.6 * s }, { x: p.x + 0.6 * s, y: p.y + 0.6 * s, z: p.z + 0.6 * s });
        this.batch.add(new RoundedBoxGeometry(1.2 * s, 0.6 * s, 1.2 * s, 3, 0.2 * s), toon(color), m4(p.x, p.y + 0.3 * s, p.z, yaw));
        break;
      }
      case 'ring': {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2 * size, 0.1 * size, 8, 32), toon(color, { unlit: true }));
        ring.position.set(p.x, p.y, p.z);
        ring.rotation.y = yaw;
        o.root.add(ring);
        const ph = this.rand() * 6;
        o.updaters.push((t) => (ring.rotation.y = yaw + Math.sin(t * 0.7 + ph) * 0.4));
        break;
      }
      case 'stripe': {
        const len = 8 * size;
        const m = new THREE.Matrix4().makeRotationY(yaw);
        m.setPosition(p.x, p.y, p.z);
        this.batch.add(new THREE.BoxGeometry(len, 0.18, 0.1), toon(color, { unlit: true }), m);
        break;
      }
    }
  }

  private buildCoins(list: { pos: THREE.Vector3; kind: 'coin' | 'gem'; block?: BumpBlock }[]) {
    const o = this.out;
    const coins = list.filter((c) => c.kind === 'coin');
    const gems = list.filter((c) => c.kind === 'gem');
    if (coins.length) {
      const geo = new THREE.CylinderGeometry(0.32, 0.32, 0.09, 20);
      geo.rotateX(Math.PI / 2);
      const faceTex = textTexture('D', { color: '#ff8a00', font: 200, width: 256, height: 256, bg: '#ffd60a' });
      const mat = [toon('#ffb000', { emissive: 0.25 }), toon('#ffffff', { map: faceTex, emissive: 0.0 })];
      // Material multi: lateral laranja, faces com "D" de Divertis
      geo.clearGroups();
      const idx = geo.index!;
      // CylinderGeometry: lateral primeiro, depois tampas
      const sideCount = 20 * 1 * 6;
      geo.addGroup(0, sideCount, 0);
      geo.addGroup(sideCount, idx.count - sideCount, 1);
      const mesh = new THREE.InstancedMesh(geo, mat, coins.length);
      o.coinMeshes.coin = mesh;
      o.root.add(mesh);
    }
    if (gems.length) {
      const geo = new THREE.OctahedronGeometry(0.42, 0);
      geo.scale(1, 1.3, 1);
      const mesh = new THREE.InstancedMesh(geo, toon(PALETTE.pink, { emissive: 0.5 }), gems.length);
      o.coinMeshes.gem = mesh;
      o.root.add(mesh);
    }
    let ci = 0;
    let gi = 0;
    list.forEach((c, i) => {
      const index = c.kind === 'coin' ? ci++ : gi++;
      const info: CoinInfo = { id: `${c.kind}_${i}`, kind: c.kind, pos: c.pos, taken: false, index, hidden: !!c.block };
      if (c.block) c.block.coin = info;
      o.coins.push(info);
    });
    o.coinsTotal = list.length;
  }
}

// ----------------------------------------------------------------------------- utilidades visuais

export function starGeo(outer: number, inner: number, depth: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: depth * 0.3, bevelThickness: depth * 0.3, bevelSegments: 1 });
  g.center();
  return g;
}

export function goldenTeddy(): THREE.Group {
  const g = new THREE.Group();
  const gold = toon('#ffc928', { emissive: 0.45 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), gold);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), gold);
  body.position.y = -0.38;
  g.add(head, body);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), gold);
    ear.position.set(0.22 * s, 0.22, 0);
    g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), toon('#3a2216'));
    eye.position.set(0.1 * s, 0.05, 0.27);
    g.add(eye);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 24), toon('#fff3b0', { unlit: true }));
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.1;
  g.add(halo);
  return g;
}

function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return `#${c.getHexString()}`;
}

let stripeTex: THREE.Texture | null = null;
function stripeTexture(a: string, b: string): THREE.Texture {
  if (stripeTex) return stripeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = b;
  for (let i = 0; i < 4; i++) ctx.fillRect(i * 32, 0, 12, 128);
  stripeTex = new THREE.CanvasTexture(c);
  stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
  stripeTex.colorSpace = THREE.SRGBColorSpace;
  return stripeTex;
}

let lavaTex: THREE.CanvasTexture | null = null;
function lavaTexture(): THREE.CanvasTexture {
  if (lavaTex) return lavaTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 128, 128);
  g.addColorStop(0, '#ff5fa2');
  g.addColorStop(0.5, '#ff8a00');
  g.addColorStop(1, '#ff3d9a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,235,120,0.75)' : 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc((i * 37) % 128, (i * 53) % 128, 6 + (i % 4) * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  lavaTex = new THREE.CanvasTexture(c);
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
  lavaTex.colorSpace = THREE.SRGBColorSpace;
  return lavaTex;
}

/** Argola para atravessar voando (alvos da fase do trampolim). */
export function flyRing(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.14, 10, 32), toon(PALETTE.greenNeon, { unlit: true }));
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 6, 32), toon('#ffffff', { unlit: true }));
  // Deitada: a criança atravessa pulando de baixo para cima.
  ring.rotation.x = inner.rotation.x = Math.PI / 2;
  const star = new THREE.Mesh(starGeo(0.25, 0.11, 0.06), toon(PALETTE.yellow, { emissive: 0.6 }));
  g.add(ring, inner, star);
  return g;
}

/** Pista de pegada (fase narrativa). */
export function pawClue(): THREE.Group {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    toon('#ffffff', { unlit: true, map: textTexture('🐾', { font: 190, width: 256, height: 256 }) }),
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.06;
  const glow = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 6, 24), toon(PALETTE.yellow, { unlit: true }));
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.08;
  g.add(plate, glow);
  return g;
}
