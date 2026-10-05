import * as THREE from 'three';
import type { CharacterId, ItemSlot } from '../../core/types';
import type { ItemDef } from '../../data/items';
import type { ResolvedLook } from '../../systems/CustomizationManager';
import { textTexture, toon, verticalGradient } from '../materials';
import { attachModel } from '../ModelLibrary';

/**
 * PERSONAGEM PLACEHOLDER (seção 51).
 * Jhow e Mina montados com formas simples, mas já com as cores e elementos oficiais
 * (moletom degradê, headphone, tranças, viseira...). O "rig" é uma hierarquia de grupos
 * com os MESMOS nomes de ossos que o modelo final deverá ter — assim o AnimationController
 * e o sistema de itens continuam funcionando quando o GLB final substituir este boneco.
 */
export const BONE_NAMES = ['hips', 'spine', 'head', 'armL', 'armR', 'legL', 'legR'] as const;
export type BoneName = (typeof BONE_NAMES)[number];

export interface Rig {
  root: THREE.Group; // pés no chão, olhando para +Z
  body: THREE.Group; // recebe squash & stretch
  bones: Record<BoneName, THREE.Group>;
  /** Pontos de encaixe de itens. */
  sockets: Record<'headTop' | 'face' | 'ears' | 'back' | 'torso' | 'hip' | 'footL' | 'footR' | 'legL' | 'legR', THREE.Group>;
}

const SKIN_FALLBACK = ['#ff8a1f', '#ffd2a1'];

export class CharacterModel {
  readonly rig: Rig;
  readonly object: THREE.Group;
  /** Cores do rastro (item de efeito), ou null. */
  trailColors: string[] | null = null;
  private furMats: THREE.MeshToonMaterial[] = [];
  private lightFurMats: THREE.MeshToonMaterial[] = [];
  private slotMeshes = new Map<ItemSlot, THREE.Object3D[]>();
  private eyes: THREE.Object3D[] = [];
  private blinkTimer = 2;

  constructor(readonly character: CharacterId, look: ResolvedLook) {
    this.rig = this.buildRig();
    this.object = this.rig.root;
    this.object.name = `character_${character}`;
    this.applyLook(look);
  }

  // ------------------------------------------------------------------ rig base

  private furMat(light = false) {
    // Materiais próprios (não do cache) porque a cor muda com o item de pelagem.
    const m = new THREE.MeshToonMaterial({ color: light ? SKIN_FALLBACK[1] : SKIN_FALLBACK[0] });
    (light ? this.lightFurMats : this.furMats).push(m);
    return m;
  }

  private buildRig(): Rig {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const g = () => new THREE.Group();
    const bones = { hips: g(), spine: g(), head: g(), armL: g(), armR: g(), legL: g(), legR: g() };
    for (const [k, b] of Object.entries(bones)) b.name = k;

    bones.hips.position.y = 0.5;
    body.add(bones.hips);
    bones.hips.add(bones.spine);
    bones.spine.position.y = 0.05;

    // Tronco (o moletom/camiseta é desenhado por cima, no socket torso)
    const torsoCore = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.22, 4, 12), this.furMat());
    torsoCore.position.y = 0.25;
    torsoCore.scale.set(1, 1, 0.85);
    bones.spine.add(torsoCore);

    // Cabeça grande (proporção chibi)
    bones.head.position.y = 0.62;
    bones.spine.add(bones.head);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), this.furMat());
    head.scale.set(1.05, 0.95, 0.95);
    head.position.y = 0.2;
    bones.head.add(head);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), this.furMat(true));
    muzzle.scale.set(1.2, 0.85, 0.8);
    muzzle.position.set(0, 0.11, 0.28);
    bones.head.add(muzzle);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), toon('#3a2216'));
    nose.scale.set(1.3, 0.9, 1);
    nose.position.set(0, 0.16, 0.4);
    bones.head.add(nose);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), toon('#3a2216'));
    mouth.position.set(0, 0.07, 0.395);
    mouth.rotation.z = Math.PI;
    bones.head.add(mouth);
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), toon('#1b1430'));
      white.scale.set(0.85, 1.15, 0.6);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), toon('#ffffff', { unlit: true }));
      shine.position.set(0.015, 0.025, 0.03);
      eye.add(white, shine);
      eye.position.set(0.12 * side, 0.27, 0.3);
      bones.head.add(eye);
      this.eyes.push(eye);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), this.furMat());
      ear.scale.set(1, 1, 0.55);
      ear.position.set(0.25 * side, 0.47, -0.02);
      bones.head.add(ear);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), this.furMat(true));
      inner.scale.set(1, 1, 0.4);
      inner.position.set(0.25 * side, 0.46, 0.03);
      bones.head.add(inner);
    }
    if (this.character === 'mina') {
      // Tranças da Mina
      for (const side of [-1, 1]) {
        const braid = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const seg = new THREE.Mesh(new THREE.SphereGeometry(0.075 - i * 0.008, 10, 8), toon('#c2561a'));
          seg.position.y = -i * 0.1;
          braid.add(seg);
        }
        const tie = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.018, 6, 10), toon('#ff4fae'));
        tie.rotation.x = Math.PI / 2;
        tie.position.y = -0.28;
        braid.add(tie);
        braid.position.set(0.3 * side, 0.12, -0.1);
        braid.rotation.z = 0.25 * side;
        bones.head.add(braid);
      }
      // Cílios
      for (const side of [-1, 1]) {
        const lash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.01), toon('#1b1430'));
        lash.position.set(0.14 * side, 0.35, 0.31);
        lash.rotation.z = -0.4 * side;
        bones.head.add(lash);
      }
    }

    // Braços (pivô no ombro)
    for (const [name, side] of [['armL', 1], ['armR', -1]] as const) {
      const arm = bones[name];
      arm.position.set(0.3 * side, 0.42, 0);
      bones.spine.add(arm);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 4, 8), this.furMat());
      upper.position.y = -0.17;
      arm.add(upper);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), this.furMat(true));
      hand.position.y = -0.36;
      arm.add(hand);
    }
    // Pernas (pivô no quadril)
    for (const [name, side] of [['legL', 1], ['legR', -1]] as const) {
      const leg = bones[name];
      leg.position.set(0.13 * side, 0, 0);
      bones.hips.add(leg);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.2, 4, 8), this.furMat());
      thigh.position.y = -0.2;
      leg.add(thigh);
    }

    const socket = (parent: THREE.Object3D, x: number, y: number, z: number) => {
      const s = new THREE.Group();
      s.position.set(x, y, z);
      parent.add(s);
      return s;
    };
    const sockets = {
      headTop: socket(bones.head, 0, 0.5, 0),
      face: socket(bones.head, 0, 0.27, 0.33),
      ears: socket(bones.head, 0, 0.25, 0),
      back: socket(bones.spine, 0, 0.3, -0.24),
      torso: socket(bones.spine, 0, 0, 0),
      hip: socket(bones.hips, 0, 0, 0),
      footL: socket(bones.legL, 0, -0.42, 0.03),
      footR: socket(bones.legR, 0, -0.42, 0.03),
      legL: socket(bones.legL, 0, 0, 0),
      legR: socket(bones.legR, 0, 0, 0),
    };
    return { root, body, bones, sockets };
  }

  // ------------------------------------------------------------------ itens

  applyLook(look: ResolvedLook): void {
    for (const slot of [...this.slotMeshes.keys()]) this.clearSlot(slot);
    const fur = look.skin?.visual.colors ?? SKIN_FALLBACK;
    for (const m of this.furMats) m.color.set(fur[0]);
    for (const m of this.lightFurMats) m.color.set(fur[1] ?? fur[0]);
    this.trailColors = null;
    for (const [slot, item] of Object.entries(look) as [ItemSlot, ItemDef][]) {
      if (slot === 'skin') continue;
      if (slot === 'effect') {
        this.trailColors = item.visual.colors;
        continue;
      }
      const meshes = this.buildItem(item);
      this.slotMeshes.set(slot, meshes);
    }
  }

  private clearSlot(slot: ItemSlot) {
    for (const o of this.slotMeshes.get(slot) ?? []) {
      o.removeFromParent();
      o.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
      });
    }
    this.slotMeshes.delete(slot);
  }

  /** Encaixe padrão de cada slot (onde um modelo 3D real de item é preso). */
  private socketFor(slot: ItemSlot): THREE.Object3D {
    const S = this.rig.sockets;
    const map: Partial<Record<ItemSlot, THREE.Object3D>> = { head: S.headTop, face: S.face, ears: S.ears, back: S.back, top: S.torso, bottom: S.hip, feet: S.footL };
    return map[slot] ?? S.torso;
  }

  private buildItem(item: ItemDef): THREE.Object3D[] {
    if (item.visual.modelUrl) {
      // Item com arte final: carrega o GLB no encaixe; se falhar, usa o provisório.
      const holder = new THREE.Group();
      this.socketFor(item.slot).add(holder);
      const out: THREE.Object3D[] = [holder];
      attachModel(holder, item.visual.modelUrl, () => {
        const fallback = this.buildItem({ ...item, visual: { ...item.visual, modelUrl: undefined } });
        out.push(...fallback);
      });
      return out;
    }
    const S = this.rig.sockets;
    const c = item.visual.colors;
    const out: THREE.Object3D[] = [];
    const add = (parent: THREE.Object3D, obj: THREE.Object3D) => {
      parent.add(obj);
      out.push(obj);
      return obj;
    };
    const mesh = (geo: THREE.BufferGeometry, color: string, o: Parameters<typeof toon>[1] = {}) =>
      new THREE.Mesh(geo, toon(color, o));

    switch (item.visual.kind) {
      case 'hoodie':
      case 'tshirt':
      case 'dress': {
        const isHoodie = item.visual.kind === 'hoodie';
        const torsoGeo = verticalGradient(new THREE.CylinderGeometry(0.29, 0.33, 0.5, 16, 4), c[0], c[1] ?? c[0]);
        const torso = new THREE.Mesh(torsoGeo, toon('#ffffff', { vertexColors: true }));
        torso.position.y = 0.24;
        torso.scale.z = 0.86;
        add(S.torso, torso);
        if (isHoodie) {
          // Camiseta branca Divertiland aparecendo pelo moletom aberto
          const tee = new THREE.Mesh(
            new THREE.PlaneGeometry(0.24, 0.36),
            toon('#ffffff', { map: textTexture('D', { color: '#8b3cff', font: 210, width: 256, height: 256, bg: '#ffffff' }) }),
          );
          tee.position.set(0, 0.24, 0.288);
          add(S.torso, tee);
          // Capuz (detalhe roxo) e cordões
          const hood = mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16), c[2] ?? '#8b3cff');
          hood.rotation.x = Math.PI / 2.4;
          hood.position.set(0, 0.5, -0.1);
          add(S.torso, hood);
          for (const side of [-1, 1]) {
            const cord = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), c[3] ?? '#ffffff');
            cord.position.set(0.07 * side, 0.36, 0.29);
            add(S.torso, cord);
          }
        } else {
          const logo = new THREE.Mesh(
            new THREE.PlaneGeometry(0.22, 0.22),
            toon('#ffffff', { map: textTexture('D', { color: c[1] ?? '#8b3cff', font: 210, width: 256, height: 256, bg: c[0] }) }),
          );
          logo.position.set(0, 0.28, 0.288);
          add(S.torso, logo);
        }
        // Mangas
        for (const [bone, side] of [[this.rig.bones.armL, 1], [this.rig.bones.armR, -1]] as const) {
          const len = isHoodie ? 0.28 : 0.13;
          const sleeve = new THREE.Mesh(
            verticalGradient(new THREE.CylinderGeometry(0.095, 0.105, len, 10), c[0], c[1] ?? c[0]),
            toon('#ffffff', { vertexColors: true }),
          );
          sleeve.position.y = -len / 2 - 0.02;
          void side;
          add(bone, sleeve);
          if (isHoodie) {
            const cuff = mesh(new THREE.TorusGeometry(0.095, 0.025, 6, 12), c[2] ?? '#8b3cff');
            cuff.rotation.x = Math.PI / 2;
            cuff.position.y = -len - 0.02;
            add(bone, cuff);
          }
        }
        break;
      }
      case 'shorts': {
        const hip = mesh(new THREE.CylinderGeometry(0.3, 0.31, 0.16, 14), c[0]);
        hip.position.y = 0.0;
        add(S.hip, hip);
        for (const leg of [S.legL, S.legR]) {
          const l = mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.2, 10), c[0]);
          l.position.y = -0.1;
          add(leg, l);
          const pocket = mesh(new THREE.BoxGeometry(0.06, 0.08, 0.1), c[0]);
          pocket.position.set(leg === S.legL ? 0.12 : -0.12, -0.12, 0);
          add(leg, pocket);
        }
        break;
      }
      case 'skirt': {
        const skirt = mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.3, 16, 1, true), c[0], { side: THREE.DoubleSide });
        skirt.position.y = -0.08;
        add(S.hip, skirt);
        break;
      }
      case 'sneakers': {
        for (const f of [S.footL, S.footR]) {
          const shoe = mesh(new THREE.CapsuleGeometry(0.1, 0.12, 4, 8), c[0]);
          shoe.rotation.x = Math.PI / 2;
          shoe.position.z = 0.05;
          add(f, shoe);
          const sole = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.34), c[1] ?? '#ffffff');
          sole.position.set(0, -0.08, 0.05);
          add(f, sole);
        }
        break;
      }
      case 'headphones': {
        const band = mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 20, Math.PI), c[0]);
        band.position.y = 0.0;
        add(S.ears, band);
        for (const side of [-1, 1]) {
          const cup = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), c[0]);
          cup.rotation.z = Math.PI / 2;
          cup.position.set(0.36 * side, -0.02, 0);
          add(S.ears, cup);
          const ring = mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 14), c[1] ?? c[0], { emissive: 0.4 });
          ring.rotation.y = Math.PI / 2;
          ring.position.set(0.405 * side, -0.02, 0);
          add(S.ears, ring);
        }
        break;
      }
      case 'cap': {
        const dome = mesh(new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), c[0]);
        dome.position.y = -0.12;
        add(S.headTop, dome);
        const brim = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16, 1, false, -Math.PI / 2, Math.PI), c[1] ?? c[0]);
        brim.position.set(0, -0.11, 0.25);
        brim.scale.z = 1.2;
        add(S.headTop, brim);
        break;
      }
      case 'visor': {
        const band = mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 24), c[0]);
        band.rotation.x = Math.PI / 2;
        band.position.y = -0.14;
        add(S.headTop, band);
        const brim = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.025, 16, 1, false, -Math.PI / 2, Math.PI), c[0]);
        brim.position.set(0, -0.15, 0.27);
        brim.scale.z = 1.3;
        add(S.headTop, brim);
        const logo = mesh(new THREE.SphereGeometry(0.035, 8, 6), c[1] ?? '#ff4fae');
        logo.position.set(0, -0.12, 0.33);
        add(S.headTop, logo);
        break;
      }
      case 'crown': {
        const base = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10, 1, true), c[0], { side: THREE.DoubleSide, emissive: 0.25 });
        base.position.y = -0.04;
        add(S.headTop, base);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const spike = mesh(new THREE.ConeGeometry(0.045, 0.12, 6), c[0], { emissive: 0.25 });
          spike.position.set(Math.sin(a) * 0.19, 0.06, Math.cos(a) * 0.19);
          add(S.headTop, spike);
          const gem = mesh(new THREE.SphereGeometry(0.025, 6, 6), c[1] ?? '#ff3d9a', { emissive: 0.5 });
          gem.position.set(Math.sin(a) * 0.2, -0.03, Math.cos(a) * 0.2);
          add(S.headTop, gem);
        }
        break;
      }
      case 'beanie': {
        const dome = mesh(new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), c[0]);
        dome.position.y = -0.14;
        add(S.headTop, dome);
        const rim = mesh(new THREE.TorusGeometry(0.33, 0.05, 6, 20), c[1] ?? '#ffffff');
        rim.rotation.x = Math.PI / 2;
        rim.position.y = -0.13;
        add(S.headTop, rim);
        const pom = mesh(new THREE.SphereGeometry(0.08, 10, 8), c[1] ?? '#ffffff');
        pom.position.y = 0.22;
        add(S.headTop, pom);
        break;
      }
      case 'partyHat': {
        const cone = mesh(new THREE.ConeGeometry(0.15, 0.36, 14), c[0]);
        cone.position.y = 0.06;
        cone.rotation.z = -0.15;
        add(S.headTop, cone);
        const pom = mesh(new THREE.SphereGeometry(0.05, 8, 6), c[1] ?? '#ffd60a', { emissive: 0.3 });
        pom.position.set(0.03, 0.25, 0);
        add(S.headTop, pom);
        break;
      }
      case 'glasses':
      case 'starGlasses':
      case 'heartGlasses': {
        const kind = item.visual.kind;
        for (const side of [-1, 1]) {
          let lens: THREE.Mesh;
          if (kind === 'starGlasses') lens = mesh(starGeometry(0.1, 0.05, 0.03), c[0], { emissive: 0.2 });
          else if (kind === 'heartGlasses') lens = mesh(heartGeometry(0.09, 0.03), c[0], { emissive: 0.2 });
          else lens = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 16), c[1] ?? '#111', { emissive: 0.3 });
          if (kind === 'glasses') {
            lens.rotation.x = Math.PI / 2;
            const frame = mesh(new THREE.TorusGeometry(0.085, 0.018, 6, 16), c[0]);
            frame.position.set(0.12 * side, 0, 0.03);
            add(S.face, frame);
          }
          lens.position.set(0.12 * side, 0, 0.02);
          add(S.face, lens);
        }
        const bridge = mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), c[0]);
        bridge.position.set(0, 0.01, 0.03);
        add(S.face, bridge);
        break;
      }
      case 'backpack': {
        const bag = mesh(new THREE.BoxGeometry(0.36, 0.38, 0.18), c[0]);
        bag.position.set(0, -0.05, -0.04);
        add(S.back, bag);
        const pocket = mesh(new THREE.BoxGeometry(0.26, 0.16, 0.06), c[1] ?? c[0]);
        pocket.position.set(0, -0.12, -0.15);
        add(S.back, pocket);
        break;
      }
      case 'wings': {
        for (const side of [-1, 1]) {
          const wing = mesh(new THREE.SphereGeometry(0.25, 12, 8), c[0], { emissive: 0.15 });
          wing.scale.set(1.2, 0.6, 0.15);
          wing.position.set(0.25 * side, 0.05, -0.05);
          wing.rotation.z = 0.5 * side;
          add(S.back, wing);
          const tip = mesh(new THREE.SphereGeometry(0.15, 10, 8), c[1] ?? c[0], { emissive: 0.2 });
          tip.scale.set(1.1, 0.5, 0.12);
          tip.position.set(0.45 * side, 0.2, -0.05);
          tip.rotation.z = 0.8 * side;
          add(S.back, tip);
        }
        break;
      }
      case 'cape': {
        const cape = mesh(new THREE.PlaneGeometry(0.55, 0.7, 1, 4), c[0], { side: THREE.DoubleSide });
        cape.position.set(0, -0.25, -0.03);
        cape.rotation.x = 0.12;
        add(S.back, cape);
        const clasp = mesh(new THREE.SphereGeometry(0.05, 8, 6), c[1] ?? '#ffd60a', { emissive: 0.3 });
        clasp.position.set(0, 0.12, 0.05);
        add(S.back, clasp);
        break;
      }
      default:
        break;
    }
    return out;
  }

  /** Piscar de olhos (vida, mesmo parado). */
  update(dt: number): void {
    this.blinkTimer -= dt;
    const closing = this.blinkTimer < 0.12;
    for (const e of this.eyes) e.scale.y = closing ? 0.15 : 1;
    if (this.blinkTimer < 0) this.blinkTimer = 2 + Math.random() * 3;
  }

  dispose(): void {
    this.object.removeFromParent();
    this.object.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    for (const m of [...this.furMats, ...this.lightFurMats]) m.dispose();
  }
}

function starGeometry(outer: number, inner: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}

function heartGeometry(size: number, depth: number): THREE.BufferGeometry {
  const s = size;
  const shape = new THREE.Shape();
  shape.moveTo(0, -s);
  shape.bezierCurveTo(s * 1.4, -s * 0.2, s * 0.9, s * 1.1, 0, s * 0.45);
  shape.bezierCurveTo(-s * 0.9, s * 1.1, -s * 1.4, -s * 0.2, 0, -s);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}
