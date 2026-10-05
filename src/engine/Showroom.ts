import * as THREE from 'three';
import type { CharacterId } from '../core/types';
import { damp } from '../core/util';
import type { ResolvedLook } from '../systems/CustomizationManager';
import { ProceduralAnimator, type OneShot } from './character/AnimationController';
import { CharacterModel } from './character/CharacterModel';
import { PALETTE, toon } from './materials';
import type { Renderer } from './Renderer';

/**
 * "Palco" 3D usado nos menus (criação de perfil, loja, resultados): mostra o personagem
 * com o visual atual girando num pedestal. Desenha só dentro de um elemento da página.
 */
export class Showroom {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  private model: CharacterModel | null = null;
  private animator: ProceduralAnimator | null = null;
  private pedestal: THREE.Group;
  private yaw = 0.4;
  private targetYaw = 0.4;
  private dragging = false;
  private lastX = 0;
  private idleT = 0;
  private stageEl: HTMLElement | null = null;
  autoSpin = true;
  zoom = 1;

  constructor(private renderer: Renderer) {
    const hemi = new THREE.HemisphereLight('#ffffff', '#ff9ccc', 1.8);
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(2, 4, 5);
    this.scene.add(hemi, key);
    this.pedestal = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.25, 40), toon(PALETTE.purple));
    base.position.y = -0.125;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 48), toon(PALETTE.yellow, { unlit: true }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.0;
    this.pedestal.add(base, ring);
    this.scene.add(this.pedestal);
  }

  /** Liga o palco a um elemento (o personagem aparece dentro dele). */
  attach(el: HTMLElement | null) {
    this.stageEl = el;
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.targetYaw += (e.clientX - this.lastX) * 0.012;
      this.lastX = e.clientX;
      this.idleT = 0;
    });
    const up = () => (this.dragging = false);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  get active() {
    return !!this.stageEl && this.stageEl.isConnected;
  }

  setCharacter(character: CharacterId, look: ResolvedLook) {
    if (this.model && this.model.character === character) {
      this.model.applyLook(look);
      return;
    }
    this.model?.dispose();
    this.model = new CharacterModel(character, look);
    this.animator = new ProceduralAnimator(this.model.rig);
    this.scene.add(this.model.object);
  }

  play(shot: OneShot) {
    this.animator?.trigger(shot);
  }

  update(dt: number) {
    if (!this.model || !this.animator) return;
    this.idleT += dt;
    if (this.autoSpin && !this.dragging && this.idleT > 2) this.targetYaw += dt * 0.5;
    this.yaw = damp(this.yaw, this.targetYaw, 8, dt);
    this.model.object.rotation.y = this.yaw;
    this.animator.setLocomotion('idle', 0);
    this.animator.update(dt);
    this.model.update(dt);
  }

  render() {
    if (!this.stageEl || !this.stageEl.isConnected) return;
    const rect = this.stageEl.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const aspect = rect.width / rect.height;
    // Enquadra o personagem (≈2 m com acessórios) com folga, em qualquer proporção.
    const fit = 2.5 / this.zoom;
    const vFov = (this.camera.fov * Math.PI) / 180;
    let dist = fit / 2 / Math.tan(vFov / 2);
    if (aspect < 0.8) dist /= aspect / 0.8;
    this.camera.position.set(0, 1.05, dist);
    this.camera.lookAt(0, 0.85, 0);
    this.renderer.renderInRect(this.scene, this.camera, rect);
  }

  dispose() {
    this.model?.dispose();
    this.model = null;
  }
}
